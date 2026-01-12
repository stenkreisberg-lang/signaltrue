import { useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, Mail, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { QuestionnaireResult, QuestionnaireAnswer } from './types';

interface ResultsScreenProps {
  result: QuestionnaireResult;
  answers: QuestionnaireAnswer[];
  onReset: () => void;
  onSubmitEmail: (email: string, consent: boolean) => Promise<void>;
  onClose?: () => void;
}

// Dynamic headlines based on tier
const getTierHeadline = (tier: string) => {
  switch (tier) {
    case 'strong-fit':
      return "You're not late — but the window is narrower than it looks.";
    case 'good-fit':
      return "You're catching some signals early. Others are still hidden.";
    case 'not-yet-fit':
      return "Right now, SignalTrue may be more than you need.";
    default:
      return "Here's what we found.";
  }
};

// Dynamic explanation based on tier
const getTierExplanation = (tier: string) => {
  switch (tier) {
    case 'strong-fit':
      return "Your organization has the scale, the collaboration patterns, and the visibility gaps where early signals matter most. Teams like yours often discover strain patterns 4–6 weeks before they'd otherwise surface — enough time to intervene before it becomes attrition.";
    case 'good-fit':
      return "You're in a position where some signals are visible, but critical ones — like workload imbalance or meeting drag — often stay hidden until they escalate. SignalTrue helps HR teams like yours spot what's brewing before it becomes a conversation you wish you'd had earlier.";
    case 'not-yet-fit':
      return "Based on your team size and work patterns, the complexity that SignalTrue is built for may not be present yet. That's not a bad thing — it means you likely have more direct visibility into how your people are doing. As you grow, this changes quickly.";
    default:
      return "Based on your answers, here's what we typically see for organizations like yours.";
  }
};

const ResultsScreen = ({
  result,
  answers,
  onReset,
  onSubmitEmail,
  onClose,
}: ResultsScreenProps) => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

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

  // Success state after email submission
  if (isSubmitted) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-slide-up text-center">
        <div className="bg-success/10 rounded-2xl border border-success/30 p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground mb-3">
            Check your inbox
          </h3>
          <p className="text-muted-foreground mb-6">
            We've sent your detailed results to <strong>{email}</strong>
          </p>
          <Button
            variant="outline"
            onClick={onClose}
            className="min-w-[200px]"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  // Email capture form (shown after user clicks to get details)
  if (showEmailForm) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-slide-up">
        <div className="bg-card rounded-2xl border border-border/50 p-8">
          <h3 className="text-2xl font-display font-bold text-foreground mb-3 text-center">
            Want a detailed breakdown of what this means for your teams?
          </h3>
          <p className="text-muted-foreground text-center mb-8">
            We'll send you a summary of where hidden risk usually shows up — based on your answers.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  id="email"
                  placeholder="Your work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-border/50 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  autoFocus
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
                I agree to receive my results and relevant insights from SignalTrue.
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
                  Send me my results
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <button
            onClick={() => setShowEmailForm(false)}
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to results
          </button>
        </div>
      </div>
    );
  }

  // Main result screen (shown first, before email)
  return (
    <div className="w-full max-w-2xl mx-auto animate-slide-up">
      {/* Result card with emotional headline */}
      <div className={`rounded-2xl border-2 ${styles.borderColor} bg-gradient-to-br ${styles.gradient} p-8 text-center mb-8`}>
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${styles.bgColor} mb-6`}>
          <Icon className={`w-8 h-8 ${styles.textColor}`} />
        </div>

        {/* Emotional headline - not score-focused */}
        <h3 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4 leading-tight">
          {getTierHeadline(result.tier)}
        </h3>

        {/* Explanation */}
        <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto">
          {getTierExplanation(result.tier)}
        </p>
      </div>

      {/* CTA to get detailed breakdown */}
      <div className="text-center space-y-4">
        <Button
          variant="hero"
          size="lg"
          onClick={() => setShowEmailForm(true)}
          className="min-w-[280px]"
        >
          Get my detailed breakdown
          <ArrowRight className="w-5 h-5" />
        </Button>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onReset}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Take again
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
