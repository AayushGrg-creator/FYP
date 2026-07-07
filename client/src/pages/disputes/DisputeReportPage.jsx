import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispute } from '../../hooks/useDispute';
import { useAuth } from '../../hooks/useAuth';

const RESOLUTION_LABELS = {
  release_to_freelancer: 'Release full amount to freelancer',
  refund_to_client: 'Refund full amount to client',
  split: 'Split the amount between both parties',
};

const STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under review',
  awaiting_acceptance: 'Awaiting acceptance',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function DisputeReportPage() {
  const { id } = useParams();
  const { dispute, loading, error, fetchReport, acceptResolution } = useDispute();
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (id) fetchReport(id);
  }, [id, fetchReport]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptResolution(id);
    } finally {
      setAccepting(false);
    }
  };

  if (loading && !dispute) {
    return <div className="max-w-2xl mx-auto py-10 text-center text-gray-500">Loading dispute report…</div>;
  }

  if (error && !dispute) {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center text-red-600">{error}</div>
    );
  }

  if (!dispute) return null;

  const isClient = user?.userId && String(dispute.project?.client) === String(user.userId);
  const isFreelancer = user?.userId && String(dispute.project?.freelancer) === String(user.userId);
  const alreadyAccepted = isClient ? dispute.clientAccepted : isFreelancer ? dispute.freelancerAccepted : false;
  const canAccept = dispute.status === 'awaiting_acceptance' && (isClient || isFreelancer) && !alreadyAccepted;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dispute report</h1>
        <span className="inline-block mt-1 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
          {STATUS_LABELS[dispute.status] || dispute.status}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow p-5 space-y-2">
        <h2 className="text-sm font-medium text-gray-500">Original claim</h2>
        <p className="text-gray-900">{dispute.description}</p>
      </div>

      {dispute.evidenceSnapshot && (
        <div className="bg-white rounded-lg shadow p-5 space-y-3">
          <h2 className="text-sm font-medium text-gray-500">Evidence considered</h2>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Deliverable submitted: {dispute.evidenceSnapshot.hasDeliverable ? 'Yes' : 'No'}</li>
            <li>Submitted after due date: {dispute.evidenceSnapshot.wasSubmittedLate ? 'Yes' : 'No'}</li>
            <li>Files uploaded by freelancer after funding: {dispute.evidenceSnapshot.freelancerFileCount}</li>
            <li>Total messages exchanged: {dispute.evidenceSnapshot.totalMessages}</li>
          </ul>
        </div>
      )}

      {dispute.reasoning && (
        <div className="bg-white rounded-lg shadow p-5 space-y-2">
          <h2 className="text-sm font-medium text-gray-500">System reasoning</h2>
          <p className="text-sm text-gray-700">{dispute.reasoning}</p>
        </div>
      )}

      {dispute.suggestedResolution && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-medium text-green-800">Suggested resolution</h2>
          <p className="text-gray-900 font-medium">
            {RESOLUTION_LABELS[dispute.suggestedResolution] || dispute.suggestedResolution}
            {dispute.suggestedResolution === 'split' && dispute.suggestedSplitPercentFreelancer != null && (
              <> — {dispute.suggestedSplitPercentFreelancer}% to freelancer</>
            )}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-600 pt-1">
            <span>Client accepted: {dispute.clientAccepted ? '✅' : '—'}</span>
            <span>Freelancer accepted: {dispute.freelancerAccepted ? '✅' : '—'}</span>
          </div>

          {canAccept && (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="mt-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {accepting ? 'Accepting…' : 'Accept this resolution'}
            </button>
          )}

          {alreadyAccepted && dispute.status !== 'resolved' && (
            <p className="text-sm text-gray-500">You've accepted. Waiting for the other party.</p>
          )}

          {dispute.status === 'resolved' && (
            <p className="text-sm text-green-700 font-medium">
              Resolved — the milestone has been updated accordingly.
            </p>
          )}
        </div>
      )}
    </div>
  );
}