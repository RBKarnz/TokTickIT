import React, { useState, useEffect } from 'react';
import { useRequester } from '../RequesterContext.js';
import { fetchCategories, fetchSystems, createTicket, Category } from '../api.js';

interface System {
  id: number;
  name: string;
}

export default function CreateTicketPage() {
  const { activeRequester } = useRequester();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    categoryId: '',
    relatedSystemId: '',
    requestedPriority: 'MEDIUM',
    summary: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successTicket, setSuccessTicket] = useState<{ ticketNumber: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [catData, sysData] = await Promise.all([
          fetchCategories(),
          fetchSystems()
        ]);
        setCategories(catData);
        setSystems(sysData);
      } catch(e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user types
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.categoryId) newErrors.categoryId = 'Category is required.';
    if (!formData.relatedSystemId) newErrors.relatedSystemId = 'Related System is required.';
    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary is required.';
    } else if (formData.summary.trim().length < 5 || formData.summary.trim().length > 100) {
      newErrors.summary = 'Summary must be between 5 and 100 characters.';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required.';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!activeRequester) return;

    setIsSubmitting(true);
    setApiError('');

    try {
      const result = await createTicket(formData, activeRequester.id);
      setSuccessTicket(result);
    } catch (err: any) {
      setApiError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successTicket) {
    return (
      <div className="container py-5 max-w-5xl">
        <div className="card shadow-sm border-0">
          <div className="card-body text-center p-5">
            <div className="mb-4 text-success">
              <i className="bi bi-check-circle-fill" style={{ fontSize: '4rem' }}></i>
            </div>
            <h2 className="h3 mb-3" style={{ color: '#006B3C' }}>Ticket Created Successfully</h2>
            <p className="lead mb-4">
              Your ticket number is <strong className="fs-4">{successTicket.ticketNumber}</strong>
            </p>
            <button 
              className="btn btn-zen-primary px-4 py-2" 
              onClick={() => window.location.href = '/'}
            >
              Back to My Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner-border mb-3" style={{ color: '#006B3C', width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4 style={{ color: '#1E293B' }}>Loading Form...</h4>
        <p className="text-muted">Fetching categories and systems</p>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: '992px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0" style={{ color: '#1E293B' }}>Create Ticket</h1>
      </div>

      {apiError && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {apiError}
        </div>
      )}

      <div className="card shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit} noValidate>
            
            {/* Header / Read-only info */}
            <div className="row mb-4">
              <div className="col-md-6 mb-3 mb-md-0">
                <label className="form-label" style={{ fontWeight: 500, color: '#1E293B' }}>Requester Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={activeRequester?.name || ''} 
                  readOnly 
                  style={{ backgroundColor: '#F1F5F9', color: '#1E293B', borderColor: '#E2E8F0' }} 
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" style={{ fontWeight: 500, color: '#1E293B' }}>Ticket Date</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={new Date().toLocaleDateString()} 
                  readOnly 
                  style={{ backgroundColor: '#F1F5F9', color: '#1E293B', borderColor: '#E2E8F0' }} 
                />
              </div>
            </div>

            {/* Classification fields */}
            <div className="row mb-4">
              <div className="col-md-4 mb-3 mb-md-0">
                <label className="form-label" style={{ fontWeight: 500, color: '#1E293B' }}>Category <span className="text-danger">*</span></label>
                <select 
                  className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  disabled={loadingData || isSubmitting}
                >
                  <option value="">Select a category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.categoryId && <div className="invalid-feedback">{errors.categoryId}</div>}
              </div>
              <div className="col-md-4 mb-3 mb-md-0">
                <label className="form-label" style={{ fontWeight: 500, color: '#1E293B' }}>Related System <span className="text-danger">*</span></label>
                <select 
                  className={`form-select ${errors.relatedSystemId ? 'is-invalid' : ''}`}
                  name="relatedSystemId"
                  value={formData.relatedSystemId}
                  onChange={handleChange}
                  disabled={loadingData || isSubmitting}
                >
                  <option value="">Select a system</option>
                  {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.relatedSystemId && <div className="invalid-feedback">{errors.relatedSystemId}</div>}
              </div>
              <div className="col-md-4">
                <label className="form-label" style={{ fontWeight: 500, color: '#1E293B' }}>Requested Priority <span className="text-danger">*</span></label>
                <select 
                  className="form-select"
                  name="requestedPriority"
                  value={formData.requestedPriority}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            {/* Summary & Description */}
            <div className="mb-4">
              <label className="form-label" style={{ fontWeight: 500, color: '#1E293B' }}>Summary <span className="text-danger">*</span></label>
              <input 
                type="text" 
                className={`form-control ${errors.summary ? 'is-invalid' : ''}`}
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                placeholder="Brief description of the issue"
                disabled={isSubmitting}
              />
              {errors.summary && <div className="invalid-feedback">{errors.summary}</div>}
            </div>

            <div className="mb-4">
              <label className="form-label" style={{ fontWeight: 500, color: '#1E293B' }}>Description <span className="text-danger">*</span></label>
              <textarea 
                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="Detailed explanation of the issue"
                disabled={isSubmitting}
              ></textarea>
              {errors.description && <div className="invalid-feedback">{errors.description}</div>}
            </div>

            {/* Attachments (Placeholder for next step) */}
            <div className="mb-5 p-3 rounded" style={{ backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1' }}>
              <div className="text-center text-muted py-3">
                <i className="bi bi-paperclip fs-4 mb-2 d-block"></i>
                <p className="mb-0">Attachment upload will be implemented in a future step.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="d-flex justify-content-end gap-3 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button 
                type="button" 
                className="btn" 
                style={{ borderColor: '#006B3C', color: '#006B3C', minWidth: '120px' }}
                onClick={() => window.history.back()}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-zen-primary d-flex justify-content-center align-items-center" 
                style={{ minWidth: '160px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill me-2"></i> Submit Ticket
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
