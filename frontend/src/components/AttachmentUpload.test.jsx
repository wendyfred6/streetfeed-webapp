import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, waitFor } from '@testing-library/react';
import AttachmentUpload from './AttachmentUpload.jsx';

// jsdom doesn't implement createObjectURL.
URL.createObjectURL = vi.fn(() => 'blob:mock-preview');

const apiPost = vi.fn();
vi.mock('../api/client.js', () => ({
  api: { post: (...args) => apiPost(...args) },
}));

function selectFile(container) {
  const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' });
  const input = container.querySelector('input[type="file"][accept="image/*"]:not([capture])');
  Object.defineProperty(input, 'files', { value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return file;
}

describe('AttachmentUpload (FRE-321: routed through api client, errors surfaced)', () => {
  beforeEach(() => { apiPost.mockReset(); });

  it('uploads via api.post (not a raw fetch) and reports the returned key', async () => {
    apiPost.mockResolvedValue({ key: 'photos/abc.jpg' });
    const onPhotoUploaded = vi.fn();
    const onUploading = vi.fn();
    const { container } = render(
      <AttachmentUpload photoPreview={null} uploading={false} onUploading={onUploading}
        onPhotoUploaded={onPhotoUploaded} onError={vi.fn()} />
    );

    selectFile(container);

    // Optimistic preview shown immediately, before the upload resolves.
    expect(onPhotoUploaded).toHaveBeenCalledWith('blob:mock-preview', null);
    expect(onUploading).toHaveBeenCalledWith(true);

    await waitFor(() => expect(onPhotoUploaded).toHaveBeenCalledWith('blob:mock-preview', 'photos/abc.jpg'));
    expect(apiPost).toHaveBeenCalledWith('/upload', expect.any(FormData));
    expect(onUploading).toHaveBeenCalledWith(false);
  });

  it('clears the preview and reports the error via onError when the upload fails (previously: console.error only, no user feedback)', async () => {
    apiPost.mockRejectedValue(new Error('Upload mislukt'));
    const onPhotoUploaded = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <AttachmentUpload photoPreview={null} uploading={false} onUploading={vi.fn()}
        onPhotoUploaded={onPhotoUploaded} onError={onError} />
    );

    selectFile(container);

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Upload mislukt'));
    expect(onPhotoUploaded).toHaveBeenLastCalledWith(null, null);
  });
});
