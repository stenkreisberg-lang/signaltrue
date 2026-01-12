import { useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, Mail, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { QuestionnaireResult, QuestionnaireAnswer } from './types';

interface ResultsScreenProps {
  result: QuestionnaireResult;
  answers: QuestionnaireAnswer[];
  onReset: () => void;
  onSubmitEmail: (email: string, consent: boolean) => Promise<void>;
}

const ResultsScreen = ({
  result,
  answers,
  onReset,
  onSubmitEmail,
}: ResultsScreenProps) => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTierStyles = () => {
    switch (result.tier) {
      case 'strong-fit':
        return {
          bgColor: 'bg-success/10',
          borderColor: 'border-success/30',
          textColor: 'text-success',
          icon: CheckCircle,
          gradient: 'from-success/20 to-success/5',
        };
      case 'good-fit':
        return {
          bgColor: 'bg-primary/10',
          borderColor: 'border-primary/30',
          textColor: 'text-primary',
          icon: CheckCircle,
          gradient: 'from-primary/20 to-primary/5',
        };
      case 'not-yet-fit':
        return {
          bgColor: 'bg-warning/10',
          borderColor: 'border-warning/30',
          textColor: 'text-warning',
          icon: AlertCircle,
          gradient: 'from-warning/20 to-warning/5',
        };
      default:
        return {
          bgColor: 'bg-secondary',
          borderColor: 'border-border',
          textColor: 'text-foreground',
          icon: CheckCircle,
          gradient: 'from-secondary to-secondary/50',
        };
    }
  };

  const styles = getTierStyles();
  const Icon = styles.icon;

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitEmail(email, consent);
      setIsSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-slide-up">
      {/* Result card */}
      <div className={`rounded-2xl border-2 ${styles.borderColor} bg-gradient-to-br ${styles.gradient} p-8 text-center mb-8`}>
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${styles.bgColor} mb-6`}>
          <Icon className={`w-8 h-8 ${styles.textColor}`} />
        </div>

        <div className="mb-4">
          <span className={`text-lg font-semibold ${styles.textColor}`}>
            You scored {result.score}
          </span>
        </div>

        <h3 className="text-3xl font-display font-bold text-foreground mb-4">
          {result.tierLabel}
        </h3>

        <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto">
          {result.tierDescription}
        </p>
      </div>

      {/* Email capture form or success message */}
      {!isSubmitted ? (
        <div className="bg-card rounded-2xl border border-border/50 p-8">
          <h4 className="text-xl font-display font-semibold text-foreground mb-2 text-center">
            Want a detailed breakdown?
          </h4>
          <p className="text-muted-foreground text-center mb-6">
            Get a personalized PDF summary with recommendations tailored to your answers.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-border/50 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>

            {/* GDPR consent */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
              />
              <label htmlFor="consent" className="text-sm text-muted-foreground leading-relaxed">
                I consent to receiving this summary and future relevant content from SignalTrue. 
                You can unsubscribe at any time.
              </label>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Get Your Detailed Fit Summary
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="bg-success/10 rounded-2xl border border-success/30 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/20 mb-4">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <h4 className="text-xl font-display font-semibold text-foreground mb-2">
            Check your inbox!
          </h4>
          <p className="text-muted-foreground">
            We've sent your personalized fit summary to <strong>{email}</strong>
          </p>
        </div>
      )}

      {/* Reset button */}
      <div className="mt-6 text-center">
        <Button
          variant="ghost"
          onClick={onReset}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Take the assessment again
        </Button>
      </div>
    </div>
  );
};

export default ResultsScreen;
