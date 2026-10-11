import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Prompt } from '../src/types';
import PromptCard from '../src/components/PromptCard';
import PromptFillerModal from '../src/components/PromptFillerModal';

vi.mock('../src/firebase', () => ({ db: {} }));
vi.mock('../src/components/CommentsSection', () => ({ default: () => null }));

const privatePrompt: Prompt = {
  id: 'private-remix', userId: 'owner', title: 'Mi documentación', description: 'Explica una función.',
  promptText: 'SECRETO PRIVADO: documenta {{código-fuente}} para {{ audiencia }}. <script>alert(1)</script>',
  category: 'Programación', tags: ['typescript'], isFavorite: true, isShared: false,
  forkedFromPromptId: 'source-prompt', forkedFromTitle: 'Documentación de código',
  forkedFromAuthorName: 'CaBs', forkedFromAuthorHandle: 'cabscrypto',
  notas: 'CC BY 4.0 · Versión aprobada: original-v1', createdAt: null, updatedAt: null, folderId: 'my-folder',
};

function renderCard(prompt: Prompt, compact = true) {
  return renderToStaticMarkup(<PromptCard prompt={prompt} compact={compact} folders={[{
    id: 'my-folder', name: 'Trabajo', userId: 'owner', createdAt: null,
  }]} onFavoriteToggle={() => {}} onEdit={() => {}} onDelete={() => {}} onUse={() => {}} onCopyFilled={() => {}} />);
}

describe('compact private library', () => {
  it('keeps remix attribution, its folder and owner actions without expanding the private deliverable in a card', () => {
    const html = renderCard(privatePrompt);
    expect(html).toContain('Basado en Documentación de código por CaBs');
    expect(html).toContain('Programación · Trabajo');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Ver y preparar');
    expect(html).toContain('aria-label="Copiar original de Mi documentación"');
    expect(html).toContain('id="btn-edit-private-remix"');
    expect(html).toContain('id="btn-delete-private-remix"');
    expect(html).toContain('id="btn-export-md-private-remix"');
    expect(html).not.toContain('SECRETO PRIVADO');
    expect(html).not.toContain('<script>');
  });

  it('does not describe a saved shared source as a new approved public resource', () => {
    const html = renderCard({ ...privatePrompt, isShared: true });
    expect(html).toContain('Prompt guardado');
    expect(html).toContain('Copiar enlace público');
    expect(html).not.toContain('Prompt privado');
    expect(html).not.toContain('Publicación aprobada');
  });

  it('retains the existing expanded card interface for other surfaces by default', () => {
    const html = renderCard(privatePrompt, false);
    expect(html).toContain('id="btn-use-private-remix"');
    expect(html).toContain('Copiar Relleno');
    expect(html).toContain('id="btn-print-private-remix"');
  });

  it('keeps creator feedback reachable when a classroom prompt uses compact presentation', () => {
    const html = renderCard({ ...privatePrompt, feedbackStatus: 'revision_required',
      feedbackComments: [{ authorName: 'Profesora', text: 'Añade el resultado esperado.', createdAt: null }] });
    expect(html).toContain('Revisión requerida por el profesor');
    expect(html).toContain('Profesora: Añade el resultado esperado.');
  });
});

describe('private prompt preparation', () => {
  it('presents original and prepared copies, accessible Unicode variable fields and the existing remix conditions', () => {
    const html = renderToStaticMarkup(<PromptFillerModal prompt={privatePrompt} onClose={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('for="filler-variable-código-fuente"');
    expect(html).toContain('id="filler-variable-audiencia"');
    expect(html).toContain('Copiar original');
    expect(html).toContain('Copiar preparado');
    expect(html).toContain('Remix de Documentación de código');
    expect(html).toContain('por CaBs');
    expect(html).toContain('CC BY 4.0');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('allows a prompt with no placeholders to be copied without requesting unused suggested fields', () => {
    const html = renderToStaticMarkup(<PromptFillerModal prompt={{ ...privatePrompt, promptText: 'Resume este texto.',
      suggestedVariables: [{ name: 'unused', description: 'Old metadata' }] }} onClose={() => {}} />);
    expect(html).toContain('sin variables pendientes');
    expect(html).not.toContain('filler-variable-unused');
  });
});
