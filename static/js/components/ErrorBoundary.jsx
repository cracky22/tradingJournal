class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="text-red-500 p-4">
          Error: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}