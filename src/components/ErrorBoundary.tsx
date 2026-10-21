import React from 'react';

/**
 * Если внутри блока произошла ошибка, страница не пропадает: вместо блока показывается fallback.
 * reset() возвращает блок к работе (например, после очистки сохранённой истории чата).
 */
export class ErrorBoundary extends React.Component<
  { fallback: (reset: () => void) => React.ReactNode; onError?: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error(error);
    this.props.onError?.();
  }
  reset = () => this.setState({ failed: false });
  render() {
    return this.state.failed ? this.props.fallback(this.reset) : this.props.children;
  }
}
