import React from 'react';

/**
 * Если внутри блока произошла ошибка, страница не пропадает: вместо блока показывается fallback.
 * reset() возвращает блок к работе (например, после очистки сохранённой истории чата).
 */
export class ErrorBoundary extends React.Component<
  { fallback: (reset: () => void, error: string) => React.ReactNode; onError?: () => void; children: React.ReactNode },
  { failed: boolean; error: string }
> {
  state = { failed: false, error: '' };
  static getDerivedStateFromError(e: unknown) {
    return { failed: true, error: e instanceof Error ? e.message : String(e) };
  }
  componentDidCatch(error: unknown) {
    console.error(error);
    this.props.onError?.();
  }
  reset = () => this.setState({ failed: false, error: '' });
  render() {
    return this.state.failed ? this.props.fallback(this.reset, this.state.error) : this.props.children;
  }
}
