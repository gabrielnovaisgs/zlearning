import { VectorStore } from '@langchain/core/vectorstores';
import { OllamaEmbeddings } from '@langchain/ollama';
import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs/promises'
import { Dirent } from 'fs';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { TextLoader } from "@langchain/classic/document_loaders/fs/text"
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import * as lancedb from "@lancedb/lancedb";
const DOCS_PATH = path.join(process.cwd(), 'docs/files/Estudos');
const DB_PATH = path.join(process.cwd(), 'docs/rag/');
@Injectable()
export class LocalRagService {

    getVectorStore(): VectorStore {
      return this.vectorStore
    }
    private vectorStore: VectorStore;
    private lanceDB: lancedb.Connection;
  
    
    async setupVectorStore(){
        const embeddings = this.getEmbeddings()
        this.lanceDB = await lancedb.connect(DB_PATH);
        
         
        const docs = await this.loadDocs()
        this.vectorStore  = new LanceDB(embeddings, {uri: DB_PATH, tableName: 'docs', mode: 'overwrite'})
        await this.vectorStore.addDocuments(docs)
    }
    

    async splitPathsByType(){ 
        const files: {[key: string]: string[]} = {}
        const entries = await fs.readdir(DOCS_PATH, {withFileTypes: true})
        await this.readAllFiles(entries, files)
        return files
    }

    async loadDocs(){
        const files = await this.splitPathsByType()
        const docs = await Promise.all([
            //this.loadPdfs(files['.pdf']), 
            this.loadMarkdown(files['.md'])
        ])
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const splitDocs = await splitter.splitDocuments(docs.flat(2))
        
       return splitDocs
    }

    async loadPdfs(files: string[]){
        const loaders = files.map((file) => new PDFLoader(file))
        const docs = await Promise.all(loaders.map((loader) => loader.load()))
        return docs
    }

    async loadMarkdown(files: string[]){
        const loaders = files.map((file) => new TextLoader(file))
        const docs = await Promise.all(loaders.map((loader) => loader.load()))
        return docs
    }
    
    async readAllFiles(entries: Dirent[], files: {[key: string]: string[]}){
         for await (const entry of entries){
             const fullPath = path.join((entry as any).path, entry.name)
            if (entry.isDirectory()){
                const subEntries = await fs.readdir(fullPath, {withFileTypes: true})
                await this.readAllFiles(subEntries, files)
            }else{
                const ext = path.extname(entry.name)
                if (!files[ext]){
                    files[ext] = []
                }
                files[ext].push(fullPath)
            }
        } 
       
        return files
    }

    
    getEmbeddings() {
        
       return new OllamaEmbeddings({
            model: 'qwen3-embedding:4b'
        })

    }
}
