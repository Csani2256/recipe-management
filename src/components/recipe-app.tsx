"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, ArrowUpRight, BookOpen, Camera, Check, ChefHat, ChevronDown,
  ChevronRight, Clock3, Cloud, Download, Heart, Home, LayoutGrid, Plus,
  Search, SlidersHorizontal, Smartphone, Sparkles, UsersRound, WifiOff, X,
  type LucideIcon,
} from "lucide-react";
import { AccountDialog, InstallDialog, RecipeDetail, RecipeEditor } from "@/components/recipe-overlays";
import { clearOfflineSnapshot, readOfflineSnapshot, saveOfflineSnapshot } from "@/lib/offline-cache";
import { CATEGORIES, type AppUser, type Category, type Recipe, type RecipeInput } from "@/lib/types";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type View = "all" | "favorites";
type Sort = "newest" | "oldest" | "name";

const categoryColors: Record<Category, string> = {
  Reggeli: "category-breakfast", Ebéd: "category-lunch", Vacsora: "category-dinner",
  Desszert: "category-dessert", Egyéb: "category-other",
};

function normalize(value: string) {
  return value.toLocaleLowerCase("hu-HU").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function RecipeCard({ recipe, onOpen, onFavorite }: { recipe: Recipe; onOpen: () => void; onFavorite: () => void }) {
  return (
    <article className="recipe-card" tabIndex={0} role="button" onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }} aria-label={`${recipe.title} recept megnyitása`}>
      <div className="card-image-wrap">
        {recipe.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={recipe.image} alt={recipe.title} className="card-image" loading="lazy" />
        ) : <div className="card-image-placeholder"><ChefHat size={43} strokeWidth={1.3} /><span>Az én receptem</span></div>}
        <span className={`card-category ${categoryColors[recipe.category] ?? "category-other"}`}>{recipe.category}</span>
        <button type="button" className={`card-favorite ${recipe.isFavorite ? "is-favorite" : ""}`} onClick={(event) => { event.stopPropagation(); onFavorite(); }} onKeyDown={(event) => event.stopPropagation()} aria-label={recipe.isFavorite ? `${recipe.title} eltávolítása a kedvencek közül` : `${recipe.title} hozzáadása a kedvencekhez`}><Heart size={19} strokeWidth={2} fill={recipe.isFavorite ? "currentColor" : "none"} /></button>
      </div>
      <div className="card-content">
        <h3>{recipe.title}</h3>
        <p className="card-description">{recipe.description || (recipe.image && !recipe.ingredients && !recipe.instructions ? "Egy megőrzött fotós recept a gyűjteményedben." : "Egy finom recept, amit érdemes megőrizni.")}</p>
        <div className="card-bottom"><div className="card-meta">{recipe.prepTime ? <span><Clock3 size={15} />{recipe.prepTime} perc</span> : <span><Camera size={15} />{recipe.image ? "Fotós recept" : "Saját recept"}</span>}{recipe.servings && <span><UsersRound size={15} />{recipe.servings} adag</span>}</div><span className="card-arrow"><ArrowUpRight size={19} /></span></div>
      </div>
    </article>
  );
}

function SidebarNavButton({ icon: Icon, label, active, count, onClick }: { icon: LucideIcon; label: string; active?: boolean; count?: number; onClick: () => void }) {
  return <button type="button" className={`sidebar-nav-item ${active ? "active" : ""}`} onClick={onClick}><Icon size={19} strokeWidth={active ? 2.1 : 1.8} /><span>{label}</span>{count !== undefined && <span className="sidebar-count">{count}</span>}</button>;
}

export function RecipeApp() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [offline, setOffline] = useState(false);
  const [view, setView] = useState<View>("all");
  const [category, setCategory] = useState<Category | "Mind">("Mind");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedId) ?? null;

  const loadData = useCallback(async () => {
    setLoadError("");
    try {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "A receptek betöltése nem sikerült.");
      setRecipes(data.recipes);
      setUser(data.user);
      setOffline(false);
    } catch (error) {
      const snapshot = await readOfflineSnapshot().catch(() => null);
      if (snapshot) {
        setRecipes(snapshot.recipes);
        setUser(snapshot.user);
        setOffline(true);
      } else {
        setLoadError(error instanceof Error ? error.message : "A receptek betöltése nem sikerült.");
        setOffline(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    if (user && !loading && !offline) void saveOfflineSnapshot({ user, recipes }).catch(() => {});
  }, [user, recipes, loading, offline]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => { void navigator.serviceWorker.register("/sw.js").catch(() => {}); };
    window.addEventListener("load", register);
    if (document.readyState === "complete") register();
    return () => window.removeEventListener("load", register);
  }, []);

  useEffect(() => {
    const handlePrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const handleInstalled = () => { setInstallPrompt(null); setToast("A Morzsa felkerült az eszközödre!"); };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", handlePrompt); window.removeEventListener("appinstalled", handleInstalled); };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!editorOpen && !selectedId && !accountOpen && !installOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editorOpen) setEditorOpen(false);
      else if (selectedId) setSelectedId(null);
      else if (accountOpen) setAccountOpen(false);
      else if (installOpen) setInstallOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onEscape); };
  }, [editorOpen, selectedId, accountOpen, installOpen]);

  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((item) => [item, recipes.filter((recipe) => recipe.category === item).length])) as Record<Category, number>, [recipes]);
  const favoriteCount = recipes.filter((recipe) => recipe.isFavorite).length;

  const filteredRecipes = useMemo(() => {
    const query = normalize(search.trim());
    return recipes.filter((recipe) => {
      if (view === "favorites" && !recipe.isFavorite) return false;
      if (category !== "Mind" && recipe.category !== category) return false;
      if (!query) return true;
      return normalize([recipe.title, recipe.description, recipe.category, recipe.ingredients, recipe.instructions].join(" ")).includes(query);
    }).sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title, "hu-HU");
      return sort === "oldest" ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [recipes, view, category, search, sort]);

  function goToCollection(nextView: View, nextCategory: Category | "Mind" = "Mind") {
    setView(nextView);
    setCategory(nextCategory);
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function focusSearch() {
    setView("all"); setCategory("Mind");
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => searchRef.current?.focus(), 250);
  }

  function openEditor(recipe: Recipe | null = null) {
    if (offline) { setToast("Mentéshez internetkapcsolat szükséges. A receptjeidet addig is olvashatod."); return; }
    setSelectedId(null);
    setEditing(recipe);
    setEditorOpen(true);
  }

  async function saveRecipe(value: RecipeInput): Promise<{ error?: string }> {
    try {
      const response = await fetch(editing ? `/api/recipes/${editing.id}` : "/api/recipes", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = await response.json();
      if (!response.ok) return { error: data.error || "Nem sikerült elmenteni a receptet." };
      const saved = data.recipe as Recipe;
      setRecipes((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setEditorOpen(false);
      setEditing(null);
      setToast(editing ? "A recept frissítve!" : "A recept biztonságban elmentve!");
      return {};
    } catch {
      return { error: "Nincs kapcsolat a szerverrel. Próbáld újra." };
    }
  }

  async function toggleFavorite(recipe: Recipe) {
    if (offline) { setToast("A kedvencek módosításához internetkapcsolat szükséges."); return; }
    const next = !recipe.isFavorite;
    setRecipes((current) => current.map((item) => item.id === recipe.id ? { ...item, isFavorite: next } : item));
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isFavorite: next }) });
      if (!response.ok) throw new Error();
      setToast(next ? "Hozzáadva a kedvencekhez." : "Eltávolítva a kedvencek közül.");
    } catch {
      setRecipes((current) => current.map((item) => item.id === recipe.id ? { ...item, isFavorite: recipe.isFavorite } : item));
      setToast("Nem sikerült módosítani a kedvencet. Próbáld újra.");
    }
  }

  async function deleteRecipe(id: string): Promise<string | null> {
    if (offline) return "A recept törléséhez internetkapcsolat szükséges.";
    try {
      const response = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      if (!response.ok) { const data = await response.json(); return data.error || "Nem sikerült törölni a receptet."; }
      setRecipes((current) => current.filter((recipe) => recipe.id !== id));
      setSelectedId(null);
      setToast("A recept törölve.");
      return null;
    } catch {
      return "Nincs kapcsolat a szerverrel. Próbáld újra.";
    }
  }

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      await clearOfflineSnapshot().catch(() => {});
      setAccountOpen(false);
      setView("all"); setCategory("Mind"); setSearch("");
      setLoading(true);
      await loadData();
      setToast("Sikeresen kijelentkeztél.");
    } catch { setToast("Nem sikerült kijelentkezni. Próbáld újra."); }
  }

  async function accountSuccess() {
    setLoading(true);
    await loadData();
    setAccountOpen(false);
    setToast("Üdv a Morzsában! A receptjeid készen állnak.");
  }

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } else {
      setInstallOpen(true);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <button type="button" className="brand" onClick={() => { setView("all"); setCategory("Mind"); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Morzsa főoldal"><span className="brand-mark"><ChefHat size={25} strokeWidth={1.9} /></span><span className="brand-word">morzsa<span>.</span></span></button>
          <p className="brand-tagline">A kedvenc receptjeid otthona.</p>
        </div>
        <div className="sidebar-menu">
          <p className="sidebar-label">A RECEPTTÁRAD</p>
          <SidebarNavButton icon={LayoutGrid} label="Összes recept" count={recipes.length} active={view === "all" && category === "Mind"} onClick={() => goToCollection("all")} />
          <SidebarNavButton icon={Heart} label="Kedvencek" count={favoriteCount} active={view === "favorites"} onClick={() => goToCollection("favorites")} />
          <div className="sidebar-separator" />
          <p className="sidebar-label category-label">KATEGÓRIÁK</p>
          {CATEGORIES.map((item) => <button type="button" key={item} className={`sidebar-category ${view === "all" && category === item ? "selected" : ""}`} onClick={() => goToCollection("all", item)}><span className={`category-dot ${categoryColors[item]}`} /><span>{item}</span><span className="sidebar-category-count">{counts[item]}</span></button>)}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-install"><div className="sidebar-install-icon"><Smartphone size={20} /></div><strong>A konyhádban is veled.</strong><p>Tedd a telefonodra, és legyenek kéznél a receptjeid.</p><button type="button" onClick={() => void installApp()}>App telepítése <ArrowUpRight size={16} /></button></div>
          <button type="button" className="sidebar-profile" onClick={() => setAccountOpen(true)}><span className="profile-avatar">{user?.isGuest ? <ChefHat size={18} /> : (user?.name.charAt(0).toUpperCase() ?? <ChefHat size={18} />)}</span><span><strong>{user?.isGuest || !user ? "Vendég fiók" : user.name}</strong><small>{user?.isGuest || !user ? "Fiók létrehozása" : "Saját fiókom"}</small></span><ChevronRight size={17} /></button>
        </div>
      </aside>

      <main className="main-area">
        <div className="main-inner">
          <header className="topbar">
            <button type="button" className="mobile-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span className="brand-mark"><ChefHat size={23} /></span><span className="brand-word">morzsa<span>.</span></span></button>
            <div className="breadcrumbs"><span>A saját konyhám</span><ChevronRight size={14} /><strong>Áttekintés</strong></div>
            <div className="topbar-right"><span className="topbar-note"><span className="online-dot" /> Minden recept egy helyen</span><button type="button" className="topbar-icon" onClick={() => void installApp()} aria-label="App telepítése"><Download size={19} /></button><button type="button" className="topbar-avatar" onClick={() => setAccountOpen(true)} aria-label="Fiókom">{user && !user.isGuest ? user.name.charAt(0).toUpperCase() : <ChefHat size={19} />}</button></div>
          </header>
          {offline && <div className="offline-banner"><WifiOff size={18} /><span><strong>Offline mód.</strong> A mentett receptjeidet olvashatod; módosításhoz kapcsolódj az internethez.</span><button type="button" onClick={() => { setLoading(true); void loadData(); }}>Újrapróbálom <ArrowRight size={15} /></button></div>}

          <div className="welcome-row"><div><p className="eyebrow"><span className="eyebrow-line" /> AZ ÉN RECEPTTÁRAM</p><h1>{user && !user.isGuest ? `Szia, ${user.name.split(" ")[0]}!` : "Szia, jó hogy itt vagy!"}<span className="welcome-sparkle">✳</span></h1><p className="welcome-subtitle">Egy hely minden íznek és emléknek, amit megőriznél.</p></div><div className="welcome-flourish"><Sparkles size={24} strokeWidth={1.2} /></div></div>

          <section className="hero-banner" aria-label="Új recept hozzáadása">
            <div className="hero-copy"><div className="hero-eyebrow"><span className="hero-eyebrow-star">✳</span> A TE KONYHÁD, A TE TÖRTÉNETED</div><h2>Minden finom emlék<br /><em>megérdemel egy helyet.</em></h2><p>Gyűjtsd össze a kedvenc receptjeidet írásban vagy fotón — és találd meg őket bármikor.</p><button type="button" className="hero-cta" onClick={() => openEditor()}><Plus size={19} strokeWidth={2.4} /> Új recept mentése <ArrowRight size={18} /></button></div>
            <div className="hero-visual" aria-hidden="true"><div className="hero-ring hero-ring-outer" /><div className="hero-ring hero-ring-inner" /><div className="hero-photo"><img src="/images/hero-custom.jpg" alt="" /></div><span className="hero-small-star">✳</span><span className="hero-sticker">szeretettel<br />készült <span>♥</span></span></div>
          </section>

          <section className="collection" id="collection">
            <div className="collection-heading"><div><p className="eyebrow"><span className="eyebrow-line" /> {view === "favorites" ? "AMI KÜLÖNÖSEN KEDVES" : "A GYŰJTEMÉNYED"}</p><div className="section-title-row"><h2>{view === "favorites" ? "Kedvenceim" : "Receptjeim"}</h2><span className="recipe-count-badge">{view === "favorites" ? favoriteCount : recipes.length}</span></div><p className="section-subtitle">{view === "favorites" ? "Azok a receptek, amikhez mindig visszatérsz." : "Minden kedvenc ízed, szépen egy helyen."}</p></div><button type="button" className="outline-add" onClick={() => openEditor()}><Plus size={18} /> Új recept</button></div>

            <div className="toolbar"><div className="search-field"><Search size={20} strokeWidth={1.8} /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Keress receptet, hozzávalót..." aria-label="Keresés a receptek között" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Keresés törlése"><X size={17} /></button>}<span className="search-shortcut">⌕</span></div><div className="sort-field"><SlidersHorizontal size={18} /><select aria-label="Receptek rendezése" value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="newest">Legújabb elöl</option><option value="oldest">Legrégebbi elöl</option><option value="name">Név szerint</option></select><ChevronDown size={16} /></div></div>

            <div className="filter-row" role="group" aria-label="Kategória szűrés"><button type="button" className={`filter-pill ${category === "Mind" ? "active" : ""}`} onClick={() => setCategory("Mind")}>Mind <span>{view === "favorites" ? favoriteCount : recipes.length}</span></button>{CATEGORIES.map((item) => <button type="button" key={item} className={`filter-pill ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item}<span>{view === "favorites" ? recipes.filter((recipe) => recipe.category === item && recipe.isFavorite).length : counts[item]}</span></button>)}</div>

            {loading ? <div className="recipe-grid">{Array.from({ length: 6 }).map((_, index) => <div className="recipe-skeleton" key={index}><div /><span /><span /><span /></div>)}</div> : loadError ? <div className="empty-state"><div className="empty-icon"><Cloud size={29} /></div><h3>Most nem érjük el a recepttárad.</h3><p>{loadError}</p><button type="button" className="button-primary" onClick={() => { setLoading(true); void loadData(); }}>Újrapróbálom <ArrowRight size={18} /></button></div> : filteredRecipes.length > 0 ? <div className="recipe-grid">{filteredRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onOpen={() => setSelectedId(recipe.id)} onFavorite={() => void toggleFavorite(recipe)} />)}</div> : <div className="empty-state"><div className="empty-icon">{view === "favorites" ? <Heart size={30} /> : <Search size={30} />}</div><h3>{search ? "Nem találtunk ilyen receptet." : view === "favorites" ? "Itt lesznek a kedvenceid." : "Itt még nincs recept."}</h3><p>{search ? "Próbálj másik szóra keresni, vagy módosítsd a szűrőket." : view === "favorites" ? "A szívecskére kattintva bármelyik receptet ide mentheted." : "Mentsd el az első receptedet írásban vagy fotón!"}</p><button type="button" className="button-primary" onClick={() => { if (search || category !== "Mind" || view === "favorites") { setSearch(""); setCategory("Mind"); setView("all"); } else openEditor(); }}>{search || category !== "Mind" || view === "favorites" ? "Összes recept mutatása" : "Első recept hozzáadása"}<ArrowRight size={18} /></button></div>}
          </section>

          <footer className="page-footer"><span className="footer-brand"><ChefHat size={17} /> morzsa.</span><span>Szeretettel gyűjtve, bármikor elővehetően. <span>♥</span></span></footer>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Alsó navigáció"><button type="button" className={view === "all" && category === "Mind" ? "active" : ""} onClick={() => { setView("all"); setCategory("Mind"); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Home size={21} strokeWidth={1.9} /><span>Főoldal</span></button><button type="button" onClick={focusSearch}><Search size={22} strokeWidth={1.9} /><span>Keresés</span></button><button type="button" className="mobile-nav-add" onClick={() => openEditor()} aria-label="Új recept hozzáadása"><Plus size={27} strokeWidth={2.2} /></button><button type="button" className={view === "favorites" ? "active" : ""} onClick={() => goToCollection("favorites")}><Heart size={22} strokeWidth={1.9} fill={view === "favorites" ? "currentColor" : "none"} /><span>Kedvencek</span></button><button type="button" onClick={() => setAccountOpen(true)}><span className="mobile-profile-icon">{user && !user.isGuest ? user.name.charAt(0).toUpperCase() : <ChefHat size={19} />}</span><span>Fiókom</span></button></nav>

      {toast && <div className="toast" role="status"><span><Check size={17} /></span>{toast}<button type="button" onClick={() => setToast("")} aria-label="Értesítés bezárása"><X size={15} /></button></div>}
      {selectedRecipe && <RecipeDetail key={selectedRecipe.id} recipe={selectedRecipe} onClose={() => setSelectedId(null)} onEdit={(recipe) => openEditor(recipe)} onFavorite={(recipe) => void toggleFavorite(recipe)} onDelete={deleteRecipe} />}
      {editorOpen && <RecipeEditor key={editing?.id ?? "new"} initial={editing} onClose={() => { setEditorOpen(false); setEditing(null); }} onSave={saveRecipe} />}
      {accountOpen && user && <AccountDialog user={user} recipeCount={recipes.length} onClose={() => setAccountOpen(false)} onSuccess={accountSuccess} onLogout={logout} />}
      {installOpen && <InstallDialog onClose={() => setInstallOpen(false)} />}
    </div>
  );
}
