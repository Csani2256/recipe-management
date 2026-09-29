"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, Camera, Check, CheckCircle2, ChefHat, Clock3,
  Cloud, Download, Eye, EyeOff, Heart, ImagePlus, LockKeyhole, LogOut,
  Mail, Pencil, Plus, ShieldCheck, Smartphone, Sparkles, Trash2, Upload,
  UsersRound, X, ZoomIn,
} from "lucide-react";
import { CATEGORIES, type AppUser, type Category, type Recipe, type RecipeInput } from "@/lib/types";

const emptyRecipe: RecipeInput = {
  title: "", description: "", category: "Ebéd", prepTime: null, servings: null,
  ingredients: "", instructions: "", image: null,
};

async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Válassz egy képfájlt.");
  if (file.size > 25 * 1024 * 1024) throw new Error("A fotó túl nagy. Legfeljebb 25 MB-os képet válassz.");

  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("A fotó nem olvasható. Próbálj JPG vagy PNG képet választani."));
      image.src = url;
    });

    const maxSide = 2000;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("A fotó feldolgozása nem sikerült.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.86;
    let result = canvas.toDataURL("image/jpeg", quality);
    while (result.length > 3_800_000 && quality > 0.48) {
      quality -= 0.1;
      result = canvas.toDataURL("image/jpeg", quality);
    }
    if (result.length > 4_400_000) throw new Error("A fotó túl nagy maradt. Próbálj másik képet választani.");
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type EditorProps = {
  initial: Recipe | null;
  onClose: () => void;
  onSave: (value: RecipeInput) => Promise<{ error?: string }>;
};

export function RecipeEditor({ initial, onClose, onSave }: EditorProps) {
  const [form, setForm] = useState<RecipeInput>(initial ? {
    title: initial.title, description: initial.description, category: initial.category,
    prepTime: initial.prepTime, servings: initial.servings, ingredients: initial.ingredients,
    instructions: initial.instructions, image: initial.image,
  } : emptyRecipe);
  const [saving, setSaving] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [error, setError] = useState("");
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof RecipeInput>(field: K, value: RecipeInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setProcessingPhoto(true);
    try {
      const image = await compressImage(file);
      setField("image", image);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nem sikerült feldolgozni a fotót.");
    } finally {
      setProcessingPhoto(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Adj nevet a receptnek, hogy később könnyen megtaláld."); return; }
    setSaving(true);
    try {
      const result = await onSave(form);
      if (result.error) setError(result.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay-backdrop" onMouseDown={onClose}>
      <section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-topline" />
        <header className="dialog-header">
          <div className="dialog-header-copy">
            <div className="dialog-icon"><BookOpen size={22} strokeWidth={1.9} /></div>
            <div><span className="dialog-kicker">A RECEPTTÁRADBA</span><h2 id="editor-title">{initial ? "Recept szerkesztése" : "Új recept hozzáadása"}</h2></div>
          </div>
          <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Bezárás"><X size={21} /></button>
        </header>

        <form onSubmit={submit} className="editor-form">
          <div className="editor-scroll">
            <p className="editor-lead">{initial ? "Alakítsd a receptet pontosan olyanná, ahogy szereted." : "Írd le, fotózd le, vagy akár mindkettő. Itt biztosan megmarad."}</p>

            <div className="form-group-heading"><span className="form-step">01</span><span>Az alapok</span></div>
            <label className="form-field">
              <span>Recept neve <strong>*</strong></span>
              <input autoFocus required maxLength={120} placeholder="Pl. Nagyi almás pitéje" value={form.title} onChange={(event) => setField("title", event.target.value)} />
            </label>
            <label className="form-field">
              <span>Rövid leírás <em>nem kötelező</em></span>
              <input maxLength={500} placeholder="Egy mondat, ami segít felidézni..." value={form.description} onChange={(event) => setField("description", event.target.value)} />
            </label>
            <div className="form-row form-row-three">
              <label className="form-field"><span>Kategória</span><select value={form.category} onChange={(event) => setField("category", event.target.value as Category)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="form-field"><span>Idő (perc)</span><input type="number" min="1" max="1440" inputMode="numeric" placeholder="pl. 30" value={form.prepTime ?? ""} onChange={(event) => setField("prepTime", event.target.value ? Number(event.target.value) : null)} /></label>
              <label className="form-field"><span>Adag</span><input type="number" min="1" max="100" inputMode="numeric" placeholder="pl. 4" value={form.servings ?? ""} onChange={(event) => setField("servings", event.target.value ? Number(event.target.value) : null)} /></label>
            </div>

            <div className="form-group-heading"><span className="form-step">02</span><span>Adj hozzá fotót <small>opcionális</small></span></div>
            <input ref={galleryRef} className="visually-hidden" type="file" accept="image/*" onChange={handleFile} aria-label="Fotó kiválasztása" />
            <input ref={cameraRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={handleFile} aria-label="Fotó készítése" />
            {form.image ? (
              <div className="upload-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="A recept feltöltött fotója" />
                <div className="upload-preview-actions">
                  <span><CheckCircle2 size={17} /> Fotó hozzáadva</span>
                  <button type="button" onClick={() => setField("image", null)} aria-label="Fotó eltávolítása"><Trash2 size={17} /> Eltávolítás</button>
                </div>
              </div>
            ) : (
              <div className="upload-zone">
                <div className="upload-icon"><ImagePlus size={26} strokeWidth={1.7} /></div>
                <strong>{processingPhoto ? "Fotó előkészítése..." : "Egy kép többet mond ezer szónál"}</strong>
                <p>Fotózd le a kézzel írt receptet, vagy tölts fel egy képet az ételről.</p>
                <div className="upload-buttons">
                  <button type="button" disabled={processingPhoto} onClick={() => galleryRef.current?.click()}><Upload size={16} /> Kép kiválasztása</button>
                  <button type="button" disabled={processingPhoto} onClick={() => cameraRef.current?.click()}><Camera size={16} /> Fotó készítése</button>
                </div>
              </div>
            )}
            <p className="field-hint">Tipp: fotós recepthez is adj nevet, így később könnyen rákereshetsz.</p>

            <div className="form-group-heading"><span className="form-step">03</span><span>A recept leírása <small>opcionális</small></span></div>
            <label className="form-field"><span>Hozzávalók</span><textarea rows={5} maxLength={10000} placeholder={"Minden hozzávalót írj új sorba...\npl. 2 tojás\n200 g liszt"} value={form.ingredients} onChange={(event) => setField("ingredients", event.target.value)} /></label>
            <label className="form-field"><span>Elkészítés</span><textarea rows={6} maxLength={20000} placeholder={"Írd le a lépéseket új sorokba...\n1. Melegítsd elő a sütőt..."} value={form.instructions} onChange={(event) => setField("instructions", event.target.value)} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>
          <div className="dialog-footer"><button type="button" className="button-quiet" onClick={onClose}>Mégse</button><button type="submit" className="button-primary" disabled={saving || processingPhoto}>{saving ? "Mentés..." : initial ? "Változtatások mentése" : "Recept mentése"}<ArrowRight size={18} /></button></div>
        </form>
      </section>
    </div>
  );
}

type DetailProps = {
  recipe: Recipe;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onFavorite: (recipe: Recipe) => void;
  onDelete: (id: string) => Promise<string | null>;
};

export function RecipeDetail({ recipe, onClose, onEdit, onFavorite, onDelete }: DetailProps) {
  const [checked, setChecked] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [zoomed, setZoomed] = useState(false);
  const ingredientLines = recipe.ingredients.split("\n").map((line) => line.trim()).filter(Boolean);
  const instructionLines = recipe.instructions.split("\n").map((line) => line.trim()).filter(Boolean);

  async function deleteRecipe() {
    setDeleting(true);
    const result = await onDelete(recipe.id);
    if (result) { setError(result); setDeleting(false); }
  }

  return (
    <div className="overlay-backdrop detail-backdrop" onMouseDown={onClose}>
      <section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="detail-topbar">
          <button className="back-button" type="button" onClick={onClose}><ArrowLeft size={19} /> Vissza a receptekhez</button>
          <div className="detail-top-actions"><button type="button" className={`round-action ${recipe.isFavorite ? "is-active" : ""}`} onClick={() => onFavorite(recipe)} aria-label={recipe.isFavorite ? "Eltávolítás a kedvencek közül" : "Hozzáadás a kedvencekhez"}><Heart size={19} fill={recipe.isFavorite ? "currentColor" : "none"} /></button><button type="button" className="round-action" onClick={onClose} aria-label="Bezárás"><X size={20} /></button></div>
        </div>
        <div className="detail-scroll">
          {recipe.image ? (
            <div className="detail-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="detail-image" src={recipe.image} alt={recipe.title} />
              <button type="button" className="image-zoom-button" onClick={() => setZoomed(true)}><ZoomIn size={16} /> Fotó nagyítása</button>
            </div>
          ) : <div className="detail-no-image"><ChefHat size={45} strokeWidth={1.3} /><span>Egy jó recept mindig kéznél van.</span></div>}
          <div className="detail-content">
            <div className="detail-eyebrow"><span className="detail-category">{recipe.category}</span><span className="detail-dot">•</span><span>Az én recepttáramban</span></div>
            <h2 id="detail-title">{recipe.title}</h2>
            {recipe.description && <p className="detail-description">{recipe.description}</p>}
            {(recipe.prepTime || recipe.servings) && <div className="detail-meta">{recipe.prepTime && <div><Clock3 size={19} /><span><small>Elkészítés</small><strong>{recipe.prepTime} perc</strong></span></div>}{recipe.servings && <div><UsersRound size={19} /><span><small>Adag</small><strong>{recipe.servings} főre</strong></span></div>}</div>}
            {ingredientLines.length > 0 && <section className="detail-section"><div className="detail-section-heading"><span className="detail-heading-icon"><BookOpen size={18} /></span><h3>Hozzávalók</h3><span className="ingredient-count">{ingredientLines.length} tétel</span></div><ul className="ingredients-list">{ingredientLines.map((line, index) => <li key={`${line}-${index}`}><button type="button" className={`ingredient-check ${checked.includes(index) ? "checked" : ""}`} onClick={() => setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} aria-label={`${line} ${checked.includes(index) ? "kijelölésének törlése" : "kijelölése"}`}><Check size={13} /></button><span className={checked.includes(index) ? "checked-text" : ""}>{line}</span></li>)}</ul></section>}
            {instructionLines.length > 0 && <section className="detail-section"><div className="detail-section-heading"><span className="detail-heading-icon"><ChefHat size={18} /></span><h3>Elkészítés</h3></div><ol className="instructions-list">{instructionLines.map((line, index) => <li key={`${line}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{line.replace(/^\d+[.)]\s*/, "")}</p></li>)}</ol></section>}
            {!ingredientLines.length && !instructionLines.length && <div className="photo-only-note"><Camera size={20} /><p>Ez egy fotós recept. Koppints a képre a nagyításhoz, és máris olvashatod!</p></div>}
            <div className="detail-management"><button type="button" className="detail-edit" onClick={() => onEdit(recipe)}><Pencil size={17} /> Recept szerkesztése</button><button type="button" className="detail-delete" onClick={() => setConfirmDelete(true)}><Trash2 size={17} /> Törlés</button></div>
            {confirmDelete && <div className="delete-confirm"><strong>Biztosan törlöd ezt a receptet?</strong><p>Ezt később nem lehet visszavonni.</p><div><button type="button" onClick={() => setConfirmDelete(false)}>Mégse</button><button type="button" disabled={deleting} onClick={deleteRecipe}>{deleting ? "Törlés..." : "Igen, törlöm"}</button></div>{error && <span role="alert">{error}</span>}</div>}
          </div>
        </div>
      </section>
      {zoomed && <div className="photo-lightbox" onMouseDown={(event) => { event.stopPropagation(); setZoomed(false); }}><button type="button" onClick={() => setZoomed(false)} aria-label="Nagyítás bezárása"><X size={24} /></button>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={recipe.image ?? ""} alt={`${recipe.title} nagyítva`} onMouseDown={(event) => event.stopPropagation()} /></div>}
    </div>
  );
}

type AccountProps = {
  user: AppUser;
  recipeCount: number;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onLogout: () => Promise<void>;
};

export function AccountDialog({ user, recipeCount, onClose, onSuccess, onLogout }: AccountProps) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Valami nem sikerült. Próbáld újra."); return; }
      await onSuccess();
    } catch {
      setError("Nincs kapcsolat a szerverrel. Próbáld újra.");
    } finally { setBusy(false); }
  }

  return (
    <div className="overlay-backdrop account-backdrop" onMouseDown={onClose}>
      <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="icon-button account-close" onClick={onClose} aria-label="Bezárás"><X size={20} /></button>
        {user.isGuest ? <>
          <div className="account-art"><div className="account-art-icon"><Cloud size={28} /></div><Sparkles size={19} className="account-sparkle" /></div>
          <p className="account-eyebrow">MINDIG VELED</p>
          <h2 id="account-title">A receptjeid veled<br /><i>utaznak.</i></h2>
          <p className="account-intro">Hozz létre fiókot, és nyisd meg a gyűjteményedet telefonon vagy bármelyik böngészőben.</p>
          <div className="account-benefits"><span><ShieldCheck size={16} /> Privát recepttár</span><span><Smartphone size={16} /> Minden eszközödön</span></div>
          <div className="auth-tabs"><button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>Regisztráció</button><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Bejelentkezés</button></div>
          <form className="auth-form" onSubmit={submit}>
            {mode === "signup" && <label><span>Neved</span><div className="auth-input"><Sparkles size={17} /><input required minLength={2} maxLength={60} autoComplete="name" placeholder="Hogy szólíthatunk?" value={name} onChange={(event) => setName(event.target.value)} /></div></label>}
            <label><span>E-mail-cím</span><div className="auth-input"><Mail size={17} /><input required type="email" autoComplete="email" placeholder="te@email.hu" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
            <label><span>Jelszó</span><div className="auth-input"><LockKeyhole size={17} /><input required type={showPassword ? "text" : "password"} minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "Legalább 8 karakter" : "Jelszavad"} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Egy pillanat..." : mode === "signup" ? "Fiók létrehozása" : "Bejelentkezés"}<ArrowRight size={18} /></button>
          </form>
          <p className="auth-footnote">Vendégként is nyugodtan használhatod az appot.</p>
        </> : <>
          <div className="account-art account-art-logged"><div className="account-art-icon"><CheckCircle2 size={28} /></div></div>
          <p className="account-eyebrow">A SAJÁT KONYHÁD</p>
          <h2 id="account-title">Szia, {user.name.split(" ")[0]}!</h2>
          <p className="account-intro">A receptjeid biztonságban vannak, és minden eszközödön elérhetők.</p>
          <div className="account-profile-card"><div className="profile-avatar-large">{user.name.charAt(0).toUpperCase()}</div><div><strong>{user.name}</strong><span>{user.email}</span></div><CheckCircle2 size={19} /></div>
          <div className="account-stats"><div><strong>{recipeCount}</strong><span>elmentett recept</span></div><div><Cloud size={20} /><span>Szinkronizálva</span></div></div>
          <button type="button" className="logout-button" onClick={onLogout}><LogOut size={18} /> Kijelentkezés <ArrowRight size={17} /></button>
        </>}
      </section>
    </div>
  );
}

export function InstallDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-backdrop account-backdrop" onMouseDown={onClose}>
      <section className="account-dialog install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="icon-button account-close" onClick={onClose} aria-label="Bezárás"><X size={20} /></button>
        <div className="account-art"><div className="account-art-icon"><Download size={28} /></div><Sparkles size={19} className="account-sparkle" /></div>
        <p className="account-eyebrow">A RECEPTJEID MINDIG KÉZNÉL</p>
        <h2 id="install-title">Tedd a Morzsát<br /><i>a telefonodra.</i></h2>
        <p className="account-intro">A Morzsa webappként telepíthető: nincs szükség alkalmazásboltra, és a böngészőben is ugyanúgy működik.</p>
        <div className="install-steps"><div><span>01</span><div><strong>iPhone / Safari</strong><p>Koppints a Megosztás ikonra, majd válaszd a „Főképernyőhöz adás” lehetőséget.</p></div></div><div><span>02</span><div><strong>Android / Chrome</strong><p>Nyisd meg a böngésző menüjét, és válaszd az „Alkalmazás telepítése” vagy „Hozzáadás a kezdőképernyőhöz” opciót.</p></div></div></div>
        <button type="button" className="button-primary install-got-it" onClick={onClose}>Értem, köszönöm <Check size={18} /></button>
      </section>
    </div>
  );
}
