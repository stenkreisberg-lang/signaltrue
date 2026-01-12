import { ClipboardCheck, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';

interface FitQuestionnaireProps {
  onTrackEvent?: (eventName: string, data?: Record<string, unknown>) => void;
}

const FitQuestionnaire = ({ onTrackEvent }: FitQuestionnaireProps) => {
  // Track when user clicks to go to self-check
  const handleClick = () => {
    onTrackEvent?.('questionnaire_cta_clicked');
  };

  return (
    <section id="fit-questionnaire" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Section header */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <ClipboardCheck className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Are you seeing people strain early — or only when it's already too late?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            A short self-check for HR leaders who want earlier clarity, without surveys or extra work for teams.
          </p>

          <Link to="/self-check" onClick={handleClick}>
            <Button
              variant="hero"
              size="xl"
              className="min-w-[280px]"
            >
              Take the 2-minute HR self-check
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>

          <p className="mt-4 text-sm text-muted-foreground">
            10 quick questions • Takes about 2 minutes
          </p>
        </div>
      </div>
    </section>
  );
};

export default FitQuestionnaire;
