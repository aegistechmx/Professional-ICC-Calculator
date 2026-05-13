import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./components/Editor', () => ({ default: () => <div data-testid="mock-editor" /> }))
vi.mock('./components/Sidebar', () => ({ default: () => <div data-testid="mock-sidebar" /> }))
vi.mock('./modules/cortocircuito/CortocircuitoPage', () => ({ default: () => <div data-testid="mock-cortocircuito-page" /> }))
vi.mock('./components/ICCModule', () => ({ default: () => <div data-testid="mock-icc-module" /> }))

import App from './App.jsx'
import { tests } from './test-integration.js'

describe('Frontend integration and synchronization', () => {
  beforeEach(() => {
    window.localStorage.clear()
    // Ensure storage event handling runs in jsdom
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        hostname: 'localhost',
      },
      writable: true,
    })
  })

  it('should write sync payload to localStorage and update the displayed filename', () => {
    render(<App />)

    const syncButton = screen.getByTitle(/Sincronizar con módulo cortocircuito/i)
    expect(syncButton).toBeInTheDocument()

    fireEvent.click(syncButton)

    const nodesStorage = window.localStorage.getItem('icc-sync-nodes')
    const edgesStorage = window.localStorage.getItem('icc-sync-edges')
    const filenameStorage = window.localStorage.getItem('icc-sync-filename')

    expect(nodesStorage).toBeTruthy()
    expect(edgesStorage).toBeTruthy()
    expect(filenameStorage).toMatch(/^Proyecto ICC/)

    expect(JSON.parse(nodesStorage)).toEqual(expect.any(Object))
    expect(JSON.parse(edgesStorage)).toEqual(expect.any(Object))
    expect(screen.getByText(/Proyecto ICC/)).toBeInTheDocument()
  })

  it('should successfully import and execute the shared engine integration test', async () => {
    await tests.engine()
  })
})
