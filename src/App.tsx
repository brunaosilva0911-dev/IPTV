import { useMemo, useState } from "react";
import type { Channel, LiveEvent } from "./types";
import { eventStatus, formatHour } from "./data/events";
import {
  defaultSettings,
  useCatalog,
  useFavorites,
  useLocalStorage,
  useRecent,
  byIds,
  type ApiSettings,
} from "./lib/store";
import { Sidebar, MobileNav, type PageKey } from "./components/Nav";
import { Hero, type HeroItem } from "./components/Hero";
import { Row } from "./components/Row";
import { ChannelCard } from "./components/ChannelCard";
import { EventCard } from "./components/EventCard";
import { CategoryTiles } from "./components/CategoryTiles";
import { Player, type PlayerSource } from "./components/Player";
import { SettingsModal } from "./components/SettingsModal";
import { IconSearch, IconSettings } from "./components/Icons";

type PlayerState = {
  title: string;
  subtitle?: string;
  sources: PlayerSource[];
} | null;

const statusLabel: Record<string, string> = {
  local: "catálogo local",
  loading: "carregando…",
  remote: "API remota conectada",
  error: "falha na API (usando local)",
};

export default function App() {
  const [settings, setSettings] = useLocalStorage<ApiSettings>(
    "dp-api-settings",
    defaultSettings,
  );
  const { data, events, status } = useCatalog(settings);
  const favorites = useFavorites();
  const recent = useRecent();

  const [page, setPage] = useState<PageKey>("home");
  const [category, setCategory] = useState(0);
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState<PlayerState>(null);
  const [showSettings, setShowSettings] = useState(false);

  const channels = data.channels;
  const categories = data.categories;

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    channels.forEach((ch) =>
      ch.categories.forEach((id) => (c[id] = (c[id] ?? 0) + 1)),
    );
    return c;
  }, [channels]);

  const inCat = (id: number) =>
    id === 0 ? channels : channels.filter((c) => c.categories.includes(id));

  const openChannel = (c: Channel) => {
    recent.push(c.id);
    setPlayer({
      title: c.name,
      subtitle: "Transmissão ao vivo",
      sources: [{ label: "Player 1", url: c.url }],
    });
  };

  const openEvent = (ev: LiveEvent) => {
    setPlayer({
      title: ev.title,
      subtitle: `${ev.league.name} • ${formatHour(ev.time_start)}`,
      sources: ev.players.map((url, i) => {
        const slug = url.split("/").pop() ?? `${i + 1}`;
        const ch = channels.find((c) => c.id === slug);
        return { label: ch?.name ?? slug.toUpperCase(), url };
      }),
    });
  };

  const liveEvents = events.filter((e) => eventStatus(e) === "live");
  const soonEvents = events.filter((e) => eventStatus(e) === "soon");

  const heroItems: HeroItem[] = useMemo(() => {
    const items: HeroItem[] = [];
    (liveEvents.length ? liveEvents : soonEvents).slice(0, 3).forEach((ev) => {
      const slug = ev.players[0]?.split("/").pop() ?? "";
      const ch = channels.find((c) => c.id === slug);
      items.push({
        key: `ev-${ev.id}`,
        title: ev.title,
        badge: eventStatus(ev) === "live" ? "Ao vivo agora" : "Hoje",
        meta: `${ev.league.name} • ${formatHour(ev.time_start)} • ${ev.players.length} opções de player`,
        description:
          "Acompanhe a transmissão completa em HD, sem travamentos e com múltiplas fontes de sinal.",
        image: ch?.preview ?? ev.teams.home.image.replace("w_68,h_68", "w_900,h_900"),
        onPlay: () => openEvent(ev),
      });
    });
    ["disneyplus1", "premiere", "hbo", "espn", "globosp"].forEach((id) => {
      const ch = channels.find((c) => c.id === id);
      if (!ch) return;
      items.push({
        key: `ch-${ch.id}`,
        title: ch.name,
        badge: "Canal ao vivo",
        meta: "24h no ar • Full HD • Áudio original",
        description:
          "Os melhores filmes, séries e eventos esportivos reunidos em um só lugar. Assista quando e onde quiser.",
        image: ch.preview,
        logo: ch.image,
        onPlay: () => openChannel(ch),
        onFav: () => favorites.toggle(ch.id),
        fav: favorites.has(ch.id),
      });
    });
    return items.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, events, favorites.ids]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { channels: [], events: [] as LiveEvent[] };
    return {
      channels: channels.filter((c) => c.name.toLowerCase().includes(q)),
      events: events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.league.name.toLowerCase().includes(q),
      ),
    };
  }, [query, channels, events]);

  const card = (c: Channel) => (
    <ChannelCard
      key={c.id}
      channel={c}
      onPlay={openChannel}
      onToggleFav={favorites.toggle}
      isFav={favorites.has(c.id)}
      live
    />
  );

  return (
    <div className="min-h-screen bg-[#0a0c12] pb-16 text-white md:pb-0 md:pl-[72px]">
      <Sidebar
        page={page}
        setPage={setPage}
        onSettings={() => setShowSettings(true)}
      />
      <MobileNav page={page} setPage={setPage} />

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-gradient-to-b from-[#0a0c12] to-transparent px-4 py-3 md:hidden">
        <span className="text-lg font-black tracking-tight">
          BrasilTV<span className="text-sky-400">+</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage("search")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <IconSearch className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <IconSettings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {page === "home" && (
        <>
          <Hero items={heroItems} />
          <div className="-mt-10 relative z-10">
            <CategoryTiles
              categories={categories}
              onPick={(id) => {
                setCategory(id);
                setPage("channels");
              }}
              counts={counts}
            />

            {recent.ids.length > 0 && (
              <Row title="Continuar assistindo">
                {byIds(channels, recent.ids).map(card)}
              </Row>
            )}

            {liveEvents.length > 0 && (
              <Row title="🔴 Eventos ao vivo agora">
                {liveEvents.map((ev) => (
                  <EventCard key={ev.id} event={ev} onPlay={openEvent} />
                ))}
              </Row>
            )}

            {soonEvents.length > 0 && (
              <Row title="Próximos jogos de hoje">
                {soonEvents.slice(0, 15).map((ev) => (
                  <EventCard key={ev.id} event={ev} onPlay={openEvent} />
                ))}
              </Row>
            )}

            {favorites.ids.length > 0 && (
              <Row title="Minha Lista">
                {byIds(channels, favorites.ids).map(card)}
              </Row>
            )}

            {categories
              .filter((c) => c.id !== 0)
              .map((c) => {
                const list = inCat(c.id);
                if (!list.length) return null;
                return (
                  <Row key={c.id} title={c.name}>
                    {list.map(card)}
                  </Row>
                );
              })}
          </div>
        </>
      )}

      {page === "channels" && (
        <div className="px-4 pt-6 sm:px-10">
          <h1 className="mb-5 text-2xl font-black sm:text-3xl">Canais</h1>
          <div className="no-scrollbar mb-7 flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                  category === c.id
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">{inCat(category).map(card)}</div>
        </div>
      )}

      {page === "events" && (
        <div className="px-4 pt-6 sm:px-10">
          <h1 className="mb-1 text-2xl font-black sm:text-3xl">
            Agenda Esportiva
          </h1>
          <p className="mb-6 text-sm text-white/50">
            {events.length} transmissões • horários de Brasília
          </p>
          {liveEvents.length > 0 && (
            <>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-red-500">
                Ao vivo
              </h2>
              <div className="mb-10 flex flex-wrap gap-4">
                {liveEvents.map((ev) => (
                  <EventCard key={ev.id} event={ev} onPlay={openEvent} />
                ))}
              </div>
            </>
          )}
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">
            Todos os eventos
          </h2>
          <div className="flex flex-wrap gap-4">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} onPlay={openEvent} />
            ))}
          </div>
        </div>
      )}

      {page === "favorites" && (
        <div className="px-4 pt-6 sm:px-10">
          <h1 className="mb-5 text-2xl font-black sm:text-3xl">Minha Lista</h1>
          {favorites.ids.length === 0 ? (
            <p className="text-white/50">
              Você ainda não favoritou nenhum canal. Passe o mouse em um card e
              toque na estrela ⭐
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {byIds(channels, favorites.ids).map(card)}
            </div>
          )}
        </div>
      )}

      {page === "search" && (
        <div className="px-4 pt-6 sm:px-10">
          <div className="mb-7 flex items-center gap-3 border-b border-white/15 pb-3">
            <IconSearch className="h-6 w-6 text-white/60" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por canais, times ou campeonatos"
              className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-white/35 sm:text-2xl"
            />
          </div>
          {!query && (
            <p className="text-white/50">
              Digite para encontrar entre {channels.length} canais e{" "}
              {events.length} eventos.
            </p>
          )}
          {query && searchResults.events.length > 0 && (
            <>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">
                Eventos
              </h2>
              <div className="mb-8 flex flex-wrap gap-4">
                {searchResults.events.map((ev) => (
                  <EventCard key={ev.id} event={ev} onPlay={openEvent} />
                ))}
              </div>
            </>
          )}
          {query && (
            <>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">
                Canais
              </h2>
              <div className="flex flex-wrap gap-4">
                {searchResults.channels.map(card)}
              </div>
              {searchResults.channels.length === 0 &&
                searchResults.events.length === 0 && (
                  <p className="text-white/50">Nada encontrado para “{query}”.</p>
                )}
            </>
          )}
        </div>
      )}

      <footer className="mt-16 border-t border-white/5 px-4 py-8 text-center text-[11px] leading-relaxed text-white/35 sm:px-10">
        BrasilTV+ — interface de demonstração. Fonte de dados:{" "}
        {statusLabel[status]}. Os sinais são fornecidos por terceiros; este site
        apenas organiza e incorpora os players informados nas APIs.
      </footer>

      {player && <Player {...player} onClose={() => setPlayer(null)} />}
      {showSettings && (
        <SettingsModal
          settings={settings}
          status={statusLabel[status]}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
                     }
                               
