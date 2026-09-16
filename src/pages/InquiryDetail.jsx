import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useInquiry, useReplyInquiry, useCloseInquiry } from '../hooks/useAdmin.js';
import { Field, Textarea } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';
import { formatDateTime } from '../lib/format.js';
import styles from './InquiryDetail.module.css';

export default function InquiryDetail() {
  const { inquiryId } = useParams();
  const navigate = useNavigate();
  const query = useInquiry(inquiryId);
  const reply = useReplyInquiry(inquiryId);
  const close = useCloseInquiry(inquiryId);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  const data = query.data;
  const inquiry = data?.inquiry;
  const messages = data?.messages || [];
  const isOpen = inquiry?.status === 'open';

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (query.isLoading) return <p className={styles.msg}>Cargando…</p>;
  if (query.isError || !inquiry) {
    return (
      <p className={styles.msg}>
        No se encontró la consulta. <Link to="/consultas">Volver</Link>
      </p>
    );
  }

  async function handleSend(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText('');
    await reply.mutateAsync(value);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  return (
    <div>
      <div className={styles.crumbs}>
        <Link to="/consultas">Consultas</Link> / {inquiry.name || inquiry.dni}
      </div>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{inquiry.name || 'Consulta'}</h1>
          <p className={styles.meta}>
            DNI {inquiry.dni}
            {inquiry.whatsapp && (
              <>
                {' · '}
                <a href={`https://wa.me/${inquiry.whatsapp}`} target="_blank" rel="noreferrer">
                  WhatsApp {inquiry.whatsapp}
                </a>
              </>
            )}
            {inquiry.email && <> · {inquiry.email}</>}
          </p>
        </div>
        <span className={clsx(styles.badge, isOpen ? styles.open : styles.closed)}>
          {isOpen ? 'Abierta' : 'Cerrada'}
        </span>
      </header>

      <div className={styles.layout}>
        <div>
          <section className={clsx(styles.card, styles.summaryCard)}>
            <h2 className={styles.section}>Resumen para el asesor</h2>
            <p className={styles.summaryText}>{inquiry.summary}</p>
            <p className={styles.summaryHint}>
              Esto es lo que armó el asistente antes de derivarte la consulta — no es el chat completo
              que tuvo con la persona.
            </p>
          </section>

          <section className={styles.card}>
            <h2 className={styles.section}>Conversación</h2>
            <div className={styles.list} ref={listRef}>
              {messages.length === 0 && <p className={styles.msg}>Todavía no hay mensajes.</p>}
              {messages.map((m) => (
                <div key={m.messageId} className={clsx(styles.bubble, m.from === 'admin' ? styles.admin : styles.customer)}>
                  <span className={styles.bubbleLabel}>{m.from === 'admin' ? 'Vos' : inquiry.name || 'Comprador'}</span>
                  {m.imageUrl && (
                    <a href={m.imageUrl} target="_blank" rel="noreferrer">
                      <img className={styles.bubbleImage} src={m.imageUrl} alt="Adjunto" />
                    </a>
                  )}
                  {m.text && <p>{m.text}</p>}
                  <span className={styles.bubbleTime}>{formatDateTime(m.createdAt)}</span>
                </div>
              ))}
            </div>

            {reply.isError && <p className={styles.error}>{reply.error.message}</p>}

            {isOpen ? (
              <form className={styles.composer} onSubmit={handleSend}>
                <Field label="Respuesta">
                  {(p) => (
                    <Textarea
                      {...p}
                      rows={2}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Escribí tu respuesta… (Enter para enviar, Shift+Enter para salto de línea)"
                    />
                  )}
                </Field>
                <Button type="submit" loading={reply.isPending} disabled={!text.trim()}>
                  Enviar
                </Button>
              </form>
            ) : (
              <p className={styles.closedNote}>Esta consulta ya está cerrada.</p>
            )}
          </section>
        </div>

        <div>
          <section className={styles.card}>
            <h2 className={styles.section}>Estado</h2>
            {close.isError && <p className={styles.error}>{close.error.message}</p>}
            {isOpen ? (
              <Button
                variant="danger"
                loading={close.isPending}
                onClick={() => close.mutate()}
              >
                Cerrar consulta
              </Button>
            ) : (
              <p className={styles.msg}>Esta consulta ya se cerró.</p>
            )}
          </section>

          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← Volver
          </Button>
        </div>
      </div>
    </div>
  );
}
