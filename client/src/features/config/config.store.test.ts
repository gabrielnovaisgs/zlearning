// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { useConfigStore } from './config.store'

beforeEach(() => {
  useConfigStore.setState({
    isOpen: false,
    modelConfig: {
      chat: { model: 'qwen3.5:4b', provider: 'ollama' },
      translate: { model: 'qwen3.5:4b', provider: 'ollama' },
    },
  })
  localStorage.clear()
})

describe('config.store', () => {
  it('opens the dialog', () => {
    useConfigStore.getState().actions.open()
    expect(useConfigStore.getState().isOpen).toBe(true)
  })

  it('closes the dialog', () => {
    useConfigStore.getState().actions.open()
    useConfigStore.getState().actions.close()
    expect(useConfigStore.getState().isOpen).toBe(false)
  })

  it('updates chat model', () => {
    useConfigStore.getState().actions.setModel('chat', {
      model: 'llama3:8b',
      provider: 'ollama',
    })
    expect(useConfigStore.getState().modelConfig.chat).toEqual({
      model: 'llama3:8b',
      provider: 'ollama',
    })
  })

  it('updates translate model independently', () => {
    useConfigStore.getState().actions.setModel('translate', {
      model: 'mistral:7b',
      provider: 'ollama',
    })
    expect(useConfigStore.getState().modelConfig.translate.model).toBe('mistral:7b')
    expect(useConfigStore.getState().modelConfig.chat.model).toBe('qwen3.5:4b')
  })
})
