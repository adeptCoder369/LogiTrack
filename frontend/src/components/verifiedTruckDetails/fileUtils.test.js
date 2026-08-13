import { getExistingFileId } from './fileUtils';

describe('getExistingFileId', () => {
  it('returns the stored file id when no new file is selected', () => {
    const form = {
      invoiceNo: 'INV-1',
      invoiceDate: '2026-07-09',
      comments: 'updated',
      file: null,
      file_id: 'abc123'
    };

    expect(getExistingFileId(form)).toBe('abc123');
  });

  it('returns a new uploaded file id when provided', () => {
    const form = {
      file_id: 'old-file',
      file: 'new-file'
    };

    expect(getExistingFileId(form)).toBe('new-file');
  });
});
