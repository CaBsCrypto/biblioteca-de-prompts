import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, Braces, FileText } from 'lucide-react';
import { getChatGptListingUrl } from '../../router/publicSiteRoutes';
import { fillPromptVariables } from '../../utils/promptPreparation';
import './chatgpt-landing.css';

const EXAMPLE_CODE = 'function duplicar(numero) {\n  return numero * 2;\n}';
const EXAMPLE_TEMPLATE = 'Explica qué recibe esta función, qué devuelve y muestra un ejemplo de uso.\n\n{{codigo_software}}';

function PromptExample() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [preparedCode, setPreparedCode] = useState('');
  const prepared = preparedCode === code && code.trim() !== '';
  const preview = prepared
    ? fillPromptVariables(EXAMPLE_TEMPLATE, { codigo_software: preparedCode })
    : EXAMPLE_TEMPLATE;

  return (
    <section className="chatgpt-example" id="ejemplo" aria-labelledby="ejemplo-titulo" tabIndex={-1}>
      <div className="chatgpt-example-header">
        <FileText aria-hidden="true" size={23} />
        <div>
          <p>Demostración interactiva</p>
          <h2 id="ejemplo-titulo">Documentar una función</h2>
        </div>
      </div>
      <div className="chatgpt-example-body">
        <label htmlFor="chatgpt-example-code">Código de ejemplo</label>
        <textarea
          id="chatgpt-example-code"
          rows={3}
          maxLength={280}
          spellCheck={false}
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setPreparedCode('');
          }}
        />
        <button
          type="button"
          className="chatgpt-button chatgpt-primary"
          onClick={() => setPreparedCode(code)}
          disabled={prepared || !code.trim()}
        >
          <Braces size={17} aria-hidden="true" />
          {prepared ? 'Ejemplo preparado' : 'Preparar ejemplo'}
        </button>
        <div className="chatgpt-example-result">
          <p aria-live="polite">{prepared ? 'Prompt preparado' : 'Plantilla del prompt'}</p>
          <pre>{preview}</pre>
        </div>
      </div>
    </section>
  );
}

export default function ChatGptLanding() {
  const listingUrl = getChatGptListingUrl(import.meta.env.VITE_BIBLIOTECA_CHATGPT_LISTING_URL);

  useEffect(() => {
    const title = document.title;
    document.title = 'Biblioteca para ChatGPT';
    return () => { document.title = title; };
  }, []);

  return (
    <div className="chatgpt-page">
      <header className="chatgpt-site-header">
        <div className="chatgpt-boundary chatgpt-header-inner">
          <a className="chatgpt-wordmark" href="/">
            <span className="chatgpt-brand-mark"><BookOpen size={21} aria-hidden="true" /></span>
            Biblioteca
          </a>
          <nav aria-label="Navegación de Biblioteca para ChatGPT">
            <a href="#guia">Cómo usarla</a>
            <a href="/">Explorar la web</a>
          </nav>
        </div>
      </header>

      <main className="chatgpt-boundary">
        <div className="chatgpt-hero">
          <div className="chatgpt-intro">
            <h1>Biblioteca para ChatGPT</h1>
            <p>Encuentra prompts y skills con ejemplos, prepara el recurso que necesitas y úsalo en tu conversación.</p>
            <div className="chatgpt-hero-actions">
              {listingUrl ? (
                <a className="chatgpt-button chatgpt-primary" href={listingUrl} rel="noreferrer">
                  Activar Biblioteca en ChatGPT <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              ) : (
                <a className="chatgpt-button chatgpt-primary" href="#ejemplo">Probar un ejemplo</a>
              )}
              <a className="chatgpt-button chatgpt-secondary" href="/">Ir al catálogo web</a>
            </div>
          </div>
          <PromptExample />
        </div>

        <section className="chatgpt-guide" id="guia" aria-labelledby="guia-titulo">
          <div className="chatgpt-guide-intro">
            <h2 id="guia-titulo">Cómo usarla en ChatGPT</h2>
            <p>{listingUrl ? 'Instala Biblioteca desde su ficha en el directorio de ChatGPT para empezar.' : 'Si ya tienes Biblioteca instalada, puedes abrirla desde una conversación.'}</p>
          </div>
          <ol>
            <li><strong>Abre Biblioteca en el chat.</strong> Selecciona Biblioteca desde <b>+</b> o desde el menú de complementos. Luego escribe «Abre Biblioteca».</li>
            <li><strong>Revisa el ejemplo.</strong> Abre la ficha para ver qué necesita el recurso, qué resultado propone y quién lo creó.</li>
            <li><strong>Prepara y usa.</strong> Rellena los campos de un prompt si los tiene y elige cuándo usarlo en la conversación.</li>
          </ol>
        </section>

        <section className="chatgpt-create" aria-labelledby="crear-titulo">
          <div>
            <h2 id="crear-titulo">¿Quieres escribir tu propio prompt?</h2>
            <p>Redáctalo sin iniciar sesión y llévalo a tu dispositivo para guardarlo en tu biblioteca.</p>
          </div>
          <a className="chatgpt-button chatgpt-secondary" href="/crear">Crear un prompt</a>
        </section>
      </main>

      <footer className="chatgpt-boundary chatgpt-footer">
        <a href="/">Biblioteca · Prompts y skills</a>
      </footer>
    </div>
  );
}
