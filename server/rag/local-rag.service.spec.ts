import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalRagService } from './local-rag.service.js';
import { OllamaEmbeddings } from '@langchain/ollama';


describe('LocalRagService', () => {
  let service: LocalRagService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LocalRagService();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('loadDocs', () => {
    it('deve logar o caminho dos documentos', async () => {
      
      await service.splitPathsByType();
    });
  });

  describe('loadDocs', () => {
    it('deve carregar os documentos', async () => {
    
    
      await service.loadDocs();
      
    }, 50000);
  });

  describe('generateOllamaEmbeddings', () => {
    it('deve instanciar OllamaEmbeddings com o modelo correto', () => {
      
      service.getEmbeddings();
      
    });
  });
});
