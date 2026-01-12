import { ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Question } from './types';

interface QuestionStepProps {
  question: Question;
  currentStep: number;
  totalSteps: number;
  onSelect: (value: string, score: number) => void;
  onBack: () => void;
  selectedValue?: string;
}

const QuestionStep = ({
  question,
  currentStep,
  totalSteps,
  onSelect,
  onBack,
  selectedValue,
}: QuestionStepProps) => {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Question {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div
        key={question.id}
        className="animate-slide-up"
      >
        <h3 className="text-2xl font-display font-semibold mb-8 text-foreground text-center">
          {question.text}
        </h3>

        {/* Answer options */}
        <div className="flex flex-col gap-3">
          {question.options.map((option, index) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value, option.score)}
              className={`
                w-full p-5 rounded-xl border-2 text-left transition-all duration-200
                hover:scale-[1.02] active:scale-[0.98]
                animate-slide-up
                ${selectedValue === option.value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border/50 bg-card hover:border-primary/50 hover:bg-secondary/30 text-foreground'
                }
              `}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-4">
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200
                  ${selectedValue === option.value
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/40'
                  }
                `}>
                  {selectedValue === option.value && (
                    <div className="w-2 h-2 bg-white rounded-full animate-scale-in" />
                  )}
                </div>
                <span className="text-lg font-medium">{option.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      {currentStep > 0 && (
        <div className="mt-8 flex justify-start">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuestionStep;
