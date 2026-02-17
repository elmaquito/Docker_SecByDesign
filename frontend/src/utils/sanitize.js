import DOMPurify from 'dompurify';

export const sanitize = (dirty) => {
  return DOMPurify.sanitize(dirty);
};

export const sanitizeAndRender = (markdownOrHtml) => {
  // If we had a markdown parser, we would parse first:
  // const html = marked(markdownOrHtml);
  // For now, just sanitize HTML directly if input is HTML
  return DOMPurify.sanitize(markdownOrHtml);
};
