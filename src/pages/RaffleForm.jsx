import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useRaffle, useCreateRaffle, useUpdateRaffle } from '../hooks/useAdmin.js';
import { uploadImage } from '../lib/api.js';
import { Field, Input, Textarea, Select } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';
import { formatMoney } from '../lib/format.js';
import styles from './RaffleForm.module.css';

const newTier = () => ({
  id: `tier-${crypto.randomUUID().slice(0, 8)}`,
  chances: 1,
  price: 0,
  popular: false,
});

const EMPTY = {
  title: '',
  description: '',
  prizeTitle: '',
  prizeDescription: '',
  images: [],
  chanceTiers: [newTier()],
  totalNumbers: 100000,
  status: 'draft',
  featured: false,
  drawDate: '',
};

// ISO (backend) <-> valor de <input type=datetime-local>
const isoToLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const localToIso = (local) => (local ? new Date(local).toISOString() : undefined);

export default function RaffleForm() {
  const { raffleId } = useParams();
  const editing = Boolean(raffleId);
  const navigate = useNavigate();

  const existing = useRaffle(raffleId);
  const create = useCreateRaffle();
  const update = useUpdateRaffle(raffleId);
  const saving = create.isPending || update.isPending;

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (editing && existing.data) {
      const r = existing.data;
      setForm({
        title: r.title || '',
        description: r.description || '',
        prizeTitle: r.prizeTitle || '',
        prizeDescription: r.prizeDescription || '',
        images: r.images || [],
        chanceTiers: (r.chanceTiers?.length ? r.chanceTiers : [newTier()]).map((t) => ({
          id: t.id || `tier-${crypto.randomUUID().slice(0, 8)}`,
          chances: t.chances,
          price: t.price,
          popular: Boolean(t.popular),
        })),
        totalNumbers: r.totalNumbers ?? 100000,
        status: r.status || 'draft',
        featured: Boolean(r.featured),
        drawDate: isoToLocal(r.drawDate),
      });
    }
  }, [editing, existing.data]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setTier = (i, patch) =>
    setForm((f) => ({
      ...f,
      chanceTiers: f.chanceTiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    }));
  const addTier = () => setForm((f) => ({ ...f, chanceTiers: [...f.chanceTiers, newTier()] }));
  const removeTier = (i) =>
    setForm((f) => ({ ...f, chanceTiers: f.chanceTiers.filter((_, idx) => idx !== i) }));

  const onFiles = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    setUploading(true);
    setSubmitError('');
    try {
      const uploaded = [];
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        const { url } = await uploadImage(file, 'raffles');
        uploaded.push(url);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
    } catch (err) {
      setSubmitError(err.message || 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url) =>
    setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }));
  const makeCover = (url) =>
    setForm((f) => ({ ...f, images: [url, ...f.images.filter((u) => u !== url)] }));

  const validate = () => {
    const e = {};
    if (form.title.trim().length < 3) e.title = 'Mínimo 3 caracteres';
    if (!Number(form.totalNumbers) || Number(form.totalNumbers) < 1) e.totalNumbers = 'Requerido';
    if (!form.chanceTiers.length) e.chanceTiers = 'Cargá al menos una opción';
    form.chanceTiers.forEach((t, i) => {
      if (!Number(t.chances) || Number(t.chances) < 1) e[`tier-${i}-chances`] = 'Inválido';
      if (Number(t.price) < 0) e[`tier-${i}-price`] = 'Inválido';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      prizeTitle: form.prizeTitle.trim() || undefined,
      prizeDescription: form.prizeDescription.trim() || undefined,
      images: form.images,
      coverImage: form.images[0],
      chanceTiers: form.chanceTiers.map((t) => ({
        id: t.id,
        chances: Number(t.chances),
        price: Number(t.price),
        popular: t.popular || undefined,
      })),
      totalNumbers: Number(form.totalNumbers),
      status: form.status,
      featured: form.featured,
      drawDate: localToIso(form.drawDate),
    };

    try {
      if (editing) {
        await update.mutateAsync(payload);
      } else {
        await create.mutateAsync(payload);
      }
      navigate('/sorteos');
    } catch (err) {
      setSubmitError(err.message || 'No se pudo guardar');
      if (err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.campo, d.mensaje])));
      }
    }
  };

  const totalPreview = useMemo(
    () => form.chanceTiers.reduce((min, t) => Math.min(min, Number(t.price) || Infinity), Infinity),
    [form.chanceTiers],
  );

  if (editing && existing.isLoading) return <p className={styles.msg}>Cargando…</p>;

  return (
    <div>
      <div className={styles.crumbs}>
        <Link to="/sorteos">Sorteos</Link> / {editing ? form.title || 'Editar' : 'Nuevo sorteo'}
      </div>
      <h1 className={styles.title}>{editing ? 'Editar sorteo' : 'Nuevo sorteo'}</h1>

      <form onSubmit={onSubmit} className={styles.form} noValidate>
        <section className={styles.card}>
          <h2 className={styles.section}>Información</h2>
          <Field label="Título" required error={errors.title}>
            {(p) => (
              <Input {...p} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Sorteo Fiat Cronos 0KM" />
            )}
          </Field>
          <Field label="Descripción corta" hint="Aparece en las tarjetas del listado.">
            {(p) => (
              <Textarea {...p} value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
            )}
          </Field>
          <Field label="Nombre del premio">
            {(p) => (
              <Input {...p} value={form.prizeTitle} onChange={(e) => set('prizeTitle', e.target.value)} placeholder="Fiat Cronos Drive 1.3 · 0KM" />
            )}
          </Field>
          <Field label="Descripción del premio" hint="Sección 'Qué se sortea'.">
            {(p) => (
              <Textarea {...p} value={form.prizeDescription} onChange={(e) => set('prizeDescription', e.target.value)} rows={4} />
            )}
          </Field>
        </section>

        <section className={styles.card}>
          <h2 className={styles.section}>Imágenes</h2>
          <p className={styles.help}>La primera es la portada. Subí fotos reales del premio.</p>
          <div className={styles.images}>
            {form.images.map((url, i) => (
              <div key={url} className={styles.imgItem}>
                <img src={url} alt="" />
                {i === 0 && <span className={styles.coverTag}>Portada</span>}
                <div className={styles.imgActions}>
                  {i !== 0 && (
                    <button type="button" onClick={() => makeCover(url)}>Portada</button>
                  )}
                  <button type="button" onClick={() => removeImage(url)}>Quitar</button>
                </div>
              </div>
            ))}
            <label className={styles.imgAdd}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(e) => onFiles(e.target.files)}
              />
              {uploading ? 'Subiendo…' : '+ Agregar'}
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.section}>Opciones de compra (chances)</h2>
          {errors.chanceTiers && <p className={styles.err}>{errors.chanceTiers}</p>}
          <div className={styles.tiers}>
            <div className={styles.tierHead}>
              <span>Números</span>
              <span>Precio</span>
              <span>Más elegido</span>
              <span />
            </div>
            {form.chanceTiers.map((t, i) => (
              <div key={t.id} className={styles.tierRow}>
                <Input
                  type="number"
                  min="1"
                  value={t.chances}
                  onChange={(e) => setTier(i, { chances: e.target.value })}
                  aria-invalid={errors[`tier-${i}-chances`] ? true : undefined}
                />
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={t.price}
                  onChange={(e) => setTier(i, { price: e.target.value })}
                />
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={t.popular}
                    onChange={(e) => setTier(i, { popular: e.target.checked })}
                  />
                </label>
                <button
                  type="button"
                  className={styles.rm}
                  onClick={() => removeTier(i)}
                  disabled={form.chanceTiers.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addTier}>
            + Agregar opción
          </Button>
          {Number.isFinite(totalPreview) && (
            <p className={styles.help}>Desde {formatMoney(totalPreview)}</p>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.section}>Configuración</h2>
          <div className={styles.grid2}>
            <Field label="Total de números" required error={errors.totalNumbers} hint="Del 0 al total−1.">
              {(p) => (
                <Input {...p} type="number" min="1" value={form.totalNumbers} onChange={(e) => set('totalNumbers', e.target.value)} />
              )}
            </Field>
            <Field label="Fecha del sorteo">
              {(p) => (
                <Input {...p} type="datetime-local" value={form.drawDate} onChange={(e) => set('drawDate', e.target.value)} />
              )}
            </Field>
            <Field label="Estado">
              {(p) => (
                <Select {...p} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="draft">Borrador (no se ve)</option>
                  <option value="active">Activo (a la venta)</option>
                  <option value="paused">Pausado</option>
                  <option value="finished">Finalizado</option>
                </Select>
              )}
            </Field>
            <label className={styles.featured}>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set('featured', e.target.checked)}
              />
              Destacado en la home
            </label>
          </div>
        </section>

        {submitError && <p className={styles.err}>{submitError}</p>}

        <div className={styles.footer}>
          <Button as={Link} to="/sorteos" variant="ghost" type="button">
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={uploading}>
            {editing ? 'Guardar cambios' : 'Crear sorteo'}
          </Button>
        </div>
      </form>
    </div>
  );
}
