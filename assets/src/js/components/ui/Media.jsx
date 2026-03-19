const MEDIA_PATH = '/media';

export function Media({ src, alt = '', className = '', ...props }) {
  return (
    <img 
      src={`${MEDIA_PATH}/${src}`} 
      alt={alt} 
      className={className}
      {...props}
    />
  );
}

export function MediaBg({ src, className = '', children }) {
  return (
    <div 
      className={className}
      style={{ backgroundImage: `url(${MEDIA_PATH}/${src})` }}
    >
      {children}
    </div>
  );
}