'use strict';



/**

 * auth.controller.js

 * TaskTide – Authentication request handlers

 *

 * Handlers

 * ────────

 *  register       POST /api/auth/register

 *  login          POST /api/auth/login

 *  googleSignIn   POST /api/auth/google

 *  checkSession   GET  /api/auth/session

 *  logout         POST /api/auth/logout

 *

 * All handlers follow the pattern:

 *   validate → call service → attach cookie → respond

 *

 * Errors are caught and forwarded to the global errorHandler middleware.

 */



const authService   = require('../services/auth.service');

const tokenHelper   = require('../utils/tokenHelper');           // ✅ fixed path

const logger        = require('../config/logger');

const { VALID_ROLES, ERROR_STATUS_MAP } = require('../config/constants'); // ✅ shared constants



// ─── Helpers ──────────────────────────────────────────────────────────────────



/**

 * _resolveStatus

 * ──────────────

 * Extract the HTTP status code from a structured error message.

 * Error messages are prefixed with an error code (e.g. "USER_NOT_FOUND: …")

 *

 * @param  {Error}  err

 * @returns {number} HTTP status code

 */

function _resolveStatus(err) {

  const code = (err.message || '').split(':')[0].trim();

  return ERROR_STATUS_MAP[code] || 500;

}



/**

 * _sanitizeUser

 * ─────────────

 * Strips a Mongo user document down to the fields safe to send to the client.

 * Shared by register/login/googleSignIn so the response shape stays identical

 * across all three auth entry points.

 *

 * @param {object} user

 */

function _sanitizeUser(user) {

  return {

    userId        : user._id,

    name          : user.name,

    email         : user.email,

    role          : user.role,

    avatarUrl     : user.avatarUrl,

    trustScore    : user.trustScore,

    emailVerified : user.isVerified,

    authProvider  : user.authProvider,

  };

}



// ─── Handlers ─────────────────────────────────────────────────────────────────



/**

 * register

 * ────────

 * Handles email/password account creation.

 *

 * Request body

 * ─────────────

 * {

 *   name     : string

 *   email    : string

 *   password : string

 *   role     : 'client' | 'freelancer'

 * }

 *

 * Success response  201

 * ──────────────────────

 * Sets httpOnly tt_session cookie.

 * {

 *   success : true,

 *   message : string,

 *   user    : { userId, name, email, role, avatarUrl, trustScore, emailVerified }

 * }

 *

 * @param {import('express').Request}      req

 * @param {import('express').Response}     res

 * @param {import('express').NextFunction} next

 */

async function register(req, res, next) {

  try {

    const { name, email, password, role } = req.body;



    // ── 1. Input validation ─────────────────────────────────────────────────

    // (Field-level checks already ran in auth.routes.js validation chain —

    //  this is a defensive second layer in case the controller is ever

    //  called directly, e.g. from a test.)

    if (!name || !email || !password || !role) {

      return res.status(400).json({

        success : false,

        message : 'name, email, password and role are all required.',

      });

    }

    if (!VALID_ROLES.includes(role)) {

      return res.status(400).json({

        success : false,

        message : `role must be one of: ${VALID_ROLES.join(', ')}.`,

      });

    }



    // ── 2. Create the user (hashing + uniqueness handled in the service) ────

    let user;

    try {

      user = await authService.registerUser({ name, email, password, role });

    } catch (registerErr) {

      const status = _resolveStatus(registerErr);



      // EMAIL_TAKEN → 409, friendly message

      if (registerErr.message.startsWith('EMAIL_TAKEN')) {

        return res.status(409).json({

          success : false,

          message : 'An account with this email already exists. Try logging in instead.',

        });

      }



      logger.error('User registration failed', { email, error: registerErr.message });



      return res.status(status).json({

        success : false,

        message : registerErr.message.split(':').slice(1).join(':').trim()

          || 'Registration failed.',

      });

    }



    // ── 3. Sign JWT using "sub" claim and attach secure cookie ──────────────

    const tokenPayload = {

      sub   : user._id.toString(),

      role  : user.role,

      email : user.email,

    };



    const token = tokenHelper.attachTokenCookie(res, tokenPayload);



    logger.info('Email/password registration successful', {

      userId : user._id,

      role   : user.role,

      ip     : req.ip,

    });



    const responseBody = {

      success : true,

      message : `Welcome to TaskTide, ${user.name}! Your ${user.role} account is ready.`,

      user    : _sanitizeUser(user),

    };



    // ✅ Only expose raw token outside production (Postman / dev tooling)

    // Browser clients rely solely on the httpOnly cookie

    if (!require('../config/env').IS_PROD) {

      responseBody.token = token;

    }



    return res.status(201).json(responseBody);



  } catch (unexpectedErr) {

    logger.error('Unexpected error in register', { error: unexpectedErr.message });

    next(unexpectedErr);

  }

}



/**

 * login

 * ─────

 * Handles email/password authentication.

 *

 * Request body

 * ─────────────

 * {

 *   email    : string

 *   password : string

 * }

 *

 * Success response  200

 * ──────────────────────

 * Sets httpOnly tt_session cookie.

 * {

 *   success : true,

 *   message : string,

 *   user    : { userId, name, email, role, avatarUrl, trustScore, emailVerified }

 * }

 *

 * @param {import('express').Request}      req

 * @param {import('express').Response}     res

 * @param {import('express').NextFunction} next

 */

async function login(req, res, next) {

  try {

    const { email, password } = req.body;



    // ── 1. Input validation ─────────────────────────────────────────────────

    if (!email || !password) {

      return res.status(400).json({

        success : false,

        message : 'email and password are required.',

      });

    }



    // ── 2. Verify credentials ────────────────────────────────────────────────

    let user;

    try {

      user = await authService.authenticateUser({ email, password });

    } catch (loginErr) {

      const status = _resolveStatus(loginErr);



      // INVALID_CREDENTIALS → 401, deliberately vague (don't reveal which field was wrong)

      if (loginErr.message.startsWith('INVALID_CREDENTIALS')) {

        return res.status(401).json({

          success : false,

          message : 'Invalid email or password.',

        });

      }



      // GOOGLE_ONLY_ACCOUNT → account was created via Google, has no password

      if (loginErr.message.startsWith('GOOGLE_ONLY_ACCOUNT')) {

        return res.status(400).json({

          success : false,

          message : 'This account uses Google sign-in. Please continue with Google instead.',

        });

      }



      // ACCOUNT_SUSPENDED → 403 with clear message

      if (loginErr.message.startsWith('ACCOUNT_SUSPENDED')) {

        return res.status(403).json({

          success : false,

          message : 'Your account has been suspended. Please contact support.',

        });

      }



      logger.warn('Login attempt failed', { email, error: loginErr.message, ip: req.ip });



      return res.status(status).json({

        success : false,

        message : loginErr.message.split(':').slice(1).join(':').trim()

          || 'Login failed.',

      });

    }



    // ── 3. Sign JWT using "sub" claim and attach secure cookie ──────────────

    const tokenPayload = {

      sub   : user._id.toString(),

      role  : user.role,

      email : user.email,

    };



    const token = tokenHelper.attachTokenCookie(res, tokenPayload);



    logger.info('Email/password login successful', {

      userId : user._id,

      role   : user.role,

      ip     : req.ip,

    });



    const responseBody = {

      success : true,

      message : `Welcome back, ${user.name}!`,

      user    : _sanitizeUser(user),

    };



    if (!require('../config/env').IS_PROD) {

      responseBody.token = token;

    }



    return res.status(200).json(responseBody);



  } catch (unexpectedErr) {

    logger.error('Unexpected error in login', { error: unexpectedErr.message });

    next(unexpectedErr);

  }

}



/**

 * googleSignIn

 * ────────────

 * Handles both registration (sign-up) and authentication (sign-in) for

 * Google OAuth users.

 *

 * Request body

 * ─────────────

 * {

 *   credential : string   // Google ID token (response.credential from One Tap)

 *   isSignUp   : boolean  // true  → registration tab

 *                         // false → sign-in tab (default)

 *   role       : string   // 'client' | 'freelancer'  (required when isSignUp)

 * }

 *

 * Success response  200

 * ──────────────────────

 * Sets httpOnly tt_session cookie.

 * {

 *   success : true,

 *   message : string,

 *   user    : { userId, name, email, role, avatarUrl, trustScore, emailVerified }

 * }

 *

 * @param {import('express').Request}      req

 * @param {import('express').Response}     res

 * @param {import('express').NextFunction} next

 */

async function googleSignIn(req, res, next) {

  try {

    const { credential, isSignUp = false, role } = req.body;



    // ── 1. Input validation ─────────────────────────────────────────────────

    if (!credential || typeof credential !== 'string') {

      return res.status(400).json({

        success : false,

        message : 'credential (Google ID token) is required.',

      });

    }



    const signUpMode = Boolean(isSignUp);



    if (signUpMode) {

      if (!role) {

        return res.status(400).json({

          success : false,

          message : 'role is required when isSignUp is true.',

        });

      }

      if (!VALID_ROLES.includes(role)) {

        return res.status(400).json({

          success : false,

          message : `role must be one of: ${VALID_ROLES.join(', ')}.`,

        });

      }

    }



    // ── 2. Verify Google token & extract identity ───────────────────────────

    let identity;

    try {

      identity = await authService.verifyAndExtract(credential);

    } catch (verifyErr) {

      logger.warn('Google token verification rejected', {

        ip    : req.ip,

        error : verifyErr.message,

      });

      return res.status(_resolveStatus(verifyErr)).json({

        success : false,

        message : 'Invalid or expired Google credential. Please try again.',

      });

    }



    // ── 3. Upsert user in database ──────────────────────────────────────────

    let user;

    try {

      user = await authService.upsertUser(identity, signUpMode, role);

    } catch (upsertErr) {

      const status = _resolveStatus(upsertErr);



      // USER_NOT_FOUND on sign-in → surface a user-friendly message

      if (upsertErr.message.startsWith('USER_NOT_FOUND')) {

        return res.status(404).json({

          success : false,

          message : 'No TaskTide account found for this Google account. Please sign up first.',

        });

      }



      // ACCOUNT_SUSPENDED → 403 with clear message

      if (upsertErr.message.startsWith('ACCOUNT_SUSPENDED')) {

        return res.status(403).json({

          success : false,

          message : 'Your account has been suspended. Please contact support.',

        });

      }



      logger.error('User upsert failed', {

        email : identity.email,

        error : upsertErr.message,

      });



      return res.status(status).json({

        success : false,

        message : upsertErr.message.split(':').slice(1).join(':').trim()

          || 'Account creation failed.',

      });

    }



    // ── 4. Sign JWT using "sub" claim and attach secure cookie ──────────────

    // ✅ FIXED: use "sub" as the standard JWT subject claim

    //    (was "userId" — caused decoded.sub to be undefined in checkSession)

    const tokenPayload = {

      sub   : user._id.toString(), // ✅ standard JWT subject claim

      role  : user.role,

      email : user.email,

    };



    const token = tokenHelper.attachTokenCookie(res, tokenPayload);



    logger.info('Google OAuth sign-in successful', {

      userId   : user._id,

      role     : user.role,

      isSignUp : signUpMode,

      ip       : req.ip,

    });



    // ── 5. Determine welcome message ─────────────────────────────────────────

    // _wasExisting flag is set by upsertUser when sign-up finds an existing user

    const isNewUser = signUpMode && !user._wasExisting;

    const message   = isNewUser

      ? `Welcome to TaskTide, ${user.name}! Your ${user.role} account is ready.`

      : `Welcome back, ${user.name}!`;



    // ── 6. Return sanitised user object ─────────────────────────────────────

    const responseBody = {

      success : true,

      message,

      user    : _sanitizeUser(user),

    };



    // ✅ Only expose raw token outside production (Postman / dev tooling)

    // Browser clients rely solely on the httpOnly cookie

    if (!require('../config/env').IS_PROD) {

      responseBody.token = token;

    }



    return res.status(200).json(responseBody);



  } catch (unexpectedErr) {

    logger.error('Unexpected error in googleSignIn', { error: unexpectedErr.message });

    next(unexpectedErr);

  }

}



/**

 * checkSession

 * ────────────

 * Validates the existing session cookie and returns the current user's

 * context. Used by the React AuthContext on app load to restore state.

 *

 * Request  – no body required; reads tt_session cookie automatically.

 *

 * Success response  200

 * ──────────────────────

 * {

 *   success       : true,

 *   authenticated : true,

 *   user          : { userId, name, email, role, avatarUrl, trustScore, emailVerified }

 * }

 *

 * Failure  401  (no cookie, expired, or invalid token)

 * ───────────────────────────────────────────────────

 * {

 *   success       : false,

 *   authenticated : false,

 *   message       : string

 * }

 *

 * @param {import('express').Request}      req

 * @param {import('express').Response}     res

 * @param {import('express').NextFunction} next

 */

async function checkSession(req, res, next) {

  try {

    // ── 1. Extract token from cookie or Authorization header ────────────────

    const rawToken = tokenHelper.extractTokenFromRequest(req);



    if (!rawToken) {

      return res.status(401).json({

        success       : false,

        authenticated : false,

        message       : 'No active session found.',

      });

    }



    // ── 2. Verify and decode JWT ────────────────────────────────────────────

    let decoded;

    try {

      decoded = tokenHelper.verifyToken(rawToken);

    } catch (tokenErr) {

      // Clear a corrupted / expired cookie so the browser stops sending it

      tokenHelper.clearTokenCookie(res);



      return res.status(401).json({

        success       : false,

        authenticated : false,

        message       : tokenErr.message.startsWith('TOKEN_EXPIRED')

          ? 'Your session has expired. Please sign in again.'

          : 'Invalid session token.',

      });

    }



    // ── 3. Reload user from DB ───────────────────────────────────────────────

    // ✅ FIXED: decoded.sub is now correctly set (was decoded.userId before)

    // Ensures account still exists and hasn't been deleted or suspended

    const user = await authService.findUserById(decoded.sub);



    if (!user) {

      tokenHelper.clearTokenCookie(res);

      return res.status(401).json({

        success       : false,

        authenticated : false,

        message       : 'Account no longer exists.',

      });

    }



    // ── 4. Block suspended accounts from restoring session ──────────────────

    if (user.accountStatus === 'suspended') {

      tokenHelper.clearTokenCookie(res);

      return res.status(403).json({

        success       : false,

        authenticated : false,

        message       : 'Your account has been suspended. Please contact support.',

      });

    }



    // ── 5. Return session context ────────────────────────────────────────────

    logger.debug('Session validated', { userId: user._id, role: user.role });



    return res.status(200).json({

      success       : true,

      authenticated : true,

      user          : _sanitizeUser(user),

    });



  } catch (unexpectedErr) {

    logger.error('Unexpected error in checkSession', { error: unexpectedErr.message });

    next(unexpectedErr);

  }

}



/**

 * logout

 * ──────

 * Invalidate the client-side session by clearing the tt_session cookie.

 *

 * NOTE: JWTs are stateless — there is no server-side token blacklist in the

 * MVP. Clearing the cookie is sufficient for browser clients.

 * API consumers should discard their locally-stored token.

 *

 * Request  – no body required; reads tt_session cookie for audit logging only.

 *

 * Success response  200

 * {

 *   success : true,

 *   message : 'Logged out successfully.'

 * }

 *

 * @param {import('express').Request}      req

 * @param {import('express').Response}     res

 * @param {import('express').NextFunction} next

 */

async function logout(req, res, next) {

  try {

    // Best-effort: read current token for audit logging only

    // (do not error if missing — logout must always succeed)

    let userId = 'unknown';

    try {

      const rawToken = tokenHelper.extractTokenFromRequest(req);

      if (rawToken) {

        const decoded = tokenHelper.verifyToken(rawToken);

        userId = decoded.sub; // ✅ aligned with "sub" claim

      }

    } catch (_) {

      // Silently ignore — we still clear the cookie regardless

    }



    // Clear the httpOnly session cookie

    tokenHelper.clearTokenCookie(res);



    logger.info('User logged out', { userId, ip: req.ip });



    return res.status(200).json({

      success : true,

      message : 'Logged out successfully.',

    });



  } catch (unexpectedErr) {

    logger.error('Unexpected error in logout', { error: unexpectedErr.message });

    next(unexpectedErr);

  }

}



// ─── Exports ──────────────────────────────────────────────────────────────────



module.exports = {

  register,

  login,

  googleSignIn,

  checkSession,

  logout,

};