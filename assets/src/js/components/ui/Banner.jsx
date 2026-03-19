import { Media } from './Media';

export function Banner() {
  return (
    <div className="w-full relative">
      <Media 
        src="herolanding.webp" 
        alt="DroydMail Banner" 
        className="w-full h-auto object-contain"
      />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-surface-base" />
    </div>
  );
}