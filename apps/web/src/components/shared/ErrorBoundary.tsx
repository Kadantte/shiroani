import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Uncaught error:', error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground">
        <img
          src="/shiro-chibi.svg"
          alt="ShiroAni mascot"
          className="w-32 h-32 opacity-60 drop-shadow-lg"
        />
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-lg font-semibold">Cos poszlo nie tak</h2>
          <p className="text-sm text-muted-foreground">
            Wystapil nieoczekiwany blad. Sprobuj ponownie lub zrestartuj aplikacje.
          </p>
          {this.state.error && (
            <pre className="mt-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground text-left overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
        </div>
        <button
          onClick={this.handleReset}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Sprobuj ponownie
        </button>
      </div>
    );
  }
}
