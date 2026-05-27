import { Component, ReactNode, ErrorInfo } from 'react';
import NotFound from '../pages/NotFound';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an exception:", error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] text-slate-300 flex items-center justify-center p-4">
          <NotFound 
            error={this.state.error || new Error("Unknown client render error")} 
            resetErrorBoundary={this.resetErrorBoundary} 
          />
        </div>
      );
    }

    return this.props.children;
  }
}
