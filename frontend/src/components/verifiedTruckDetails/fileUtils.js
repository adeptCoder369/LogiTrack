export const getExistingFileId = (form) => {
  if (!form || typeof form !== 'object') return null;

  const candidate =
    form.file_id ||
    form.fileId ||
    form.fileName ||
    form.file_name ||
    form.documentFileId ||
    form.invoice_copy_id ||
    form.do_copy_file_id ||
    form.shipping_copy_id ||
    form.packing_list_copy_id;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate;
  }

  if (typeof form.file === 'string' && form.file.trim()) {
    return form.file;
  }

  return null;
};
