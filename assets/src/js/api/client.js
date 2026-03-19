let csrfToken = '';

export async function fetchCSRF() {
  const res = await fetch('/api/csrf', { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrf_token;
  return csrfToken;
}

export async function request(method, path, body = null, captcha = null, isRetry = false) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken },
  };
  if (captcha && captcha.enabled && captcha.token) {
    opts.headers['X-Recaptcha-Token'] = captcha.token;
  }
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) {
    if (!isRetry && res.status === 403 && data.error === 'invalid csrf token') {
      await fetchCSRF();
      return request(method, path, body, captcha, true);
    }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function requestWithFiles(method, path, formData, isRetry = false) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken },
    body: formData,
  };
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) {
    if (!isRetry && res.status === 403 && data.error === 'invalid csrf token') {
      await fetchCSRF();
      return requestWithFiles(method, path, formData, true);
    }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function uploadWithProgress(method, path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, path);
    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    xhr.withCredentials = true;
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error || 'Upload failed'));
        }
      } catch {
        reject(new Error('Upload failed'));
      }
    };
    
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}