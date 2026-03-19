import { useCaptcha } from '../../hooks/useCaptcha';
import { CaptchaWidget } from './CaptchaWidget';
import { useToast } from '../ui/Toast';

export function CaptchaForm({ children, onSubmit, className, renderCaptcha }) {
  const captcha = useCaptcha();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error, payload } = captcha.validate();
    if (error) {
      toast.error(error);
      return { success: false };
    }
    try {
      await onSubmit(payload);
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      captcha.reset();
      return { success: false, error: err };
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {typeof children === 'function' 
        ? children(<CaptchaWidget captcha={captcha} />)
        : (
          <>
            {children}
            <CaptchaWidget captcha={captcha} />
          </>
        )
      }
    </form>
  );
}