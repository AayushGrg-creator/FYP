import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispute } from '../../hooks/useDispute';

const REASONS = [
  { value: 'work_not_delivered', label: 'Work not delivered' },
  { value: 'work_quality_poor', label: 'Work quality is poor' },
  { value: 'payment_not_released', label: 'Payment not released' },
  { value: 'scope_creep', label: 'Scope creep' },
  { value: 'communication_breakdown', label: 'Communication breakdown' },
  { value: 'fraud_suspected', label: 'Fraud suspected' },
  { value: 'other', label: 'Other' },
];

/**
 * DisputeForm
 * Lets either party on a project raise a dispute against a specific milestone.
 * On success, redirects to the shared report page.
 *
 * Props:
 *   projectId   - string, required
 *   milestoneId - string, required
 *   onClose     - optional callback to close a modal/panel wrapping this form
 */
export default function DisputeForm({ projectId, milestoneId, onClose }) {
  const navigate = useNavigate();
  const { submitDispute, loading, error } = useDispute();

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!reason) {
      setFormError('Please select a reason.');
      return;
    }
    if (description.trim().length < 20) {
      setFormError('Please describe the issue in at least 20 characters.');
      return;
    }

    try {
      const created = await submitDispute({ projectId, milestoneId, reason, description });
      navigate(`/disputes/${created._id}`);
    } catch {
      // error state already set by the hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg w-full bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Raise a dispute</h2>
        <p className="text-sm text-gray-500 mt-1">
          This will pause the milestone and generate an evidence-based report for both parties to review.
        </p>
      </div>

      <div>
        <label htmlFor="dispute-reason" className="block text-sm font-medium text-gray-700 mb-1">
          Reason
        </label>
        <select
          id="dispute-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select a reason…</option>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="dispute-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="dispute-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="Explain what happened, with dates if relevant…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="text-xs text-gray-400 mt-1">{description.length}/5000</div>
      </div>

      {(formError || error) && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {formError || error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit dispute'}
        </button>
      </div>
    </form>
  );
}