import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:24, textAlign:'center'}}>
          <h2>Something went wrong</h2>
          <p>Check the console for details. You can reload or try another round.</p>
        </div>
      )
    }
    return this.props.children
  }
}
