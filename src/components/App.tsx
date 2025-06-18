"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  forwardRef,
} from "react";
import {
  ArrowUp,
  ArrowDown,
  Search,
  PlusCircle,
  LogIn,
  Sun,
  Moon,
  MessageCircle,
} from "lucide-react";

/*****************************************************************
 * ENV HELPERS
 *****************************************************************/
const env: Record<string, string | undefined> =
  typeof process !== "undefined" && process.env ? process.env : {};
export const GNEWS_TOKEN =
  env.NEXT_PUBLIC_GNEWS_TOKEN || env.GNEWS_TOKEN || "398eff08263b1e6180096acb4ab68a01";
const PAGE_SIZE = 10;
const GNEWS_TOPICS = [
  "world",
  "nation",
  "business",
  "technology",
  "entertainment",
  "sports",
  "science",
  "health",
];

/*****************************************************************
 * THEME CONTEXT
 *****************************************************************/
const ThemeCtx = createContext({
  theme: "light" as "light" | "dark",
  setTheme: (_: "light" | "dark") => {},
});
const useTheme = () => useContext(ThemeCtx);
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") setTheme(stored);
  }, []);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      window.localStorage.setItem("theme", theme);
    }
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

/*****************************************************************
 * UI PRIMITIVES
 *****************************************************************/
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "icon";
}
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const variantCls =
      variant === "outline"
        ? "border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
        : variant === "ghost"
        ? "hover:bg-gray-100 dark:hover:bg-gray-700"
        : "bg-orange-500 text-white hover:bg-orange-600";
    const sizeCls = size === "icon" ? "h-9 w-9 p-0" : "h-9 px-4";
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantCls} ${sizeCls} ${className}`}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex cursor-pointer items-center rounded-full border bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase dark:border-gray-700 dark:bg-gray-800 ${className}`}
      {...props}
    />
  );
}
function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 ${className}`}
      {...props}
    />
  );
}
function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 ${className}`} {...props} />;
}

/*****************************************************************
 * VOTE BAR
 *****************************************************************/
function VoteBar({ initialVotes }: { initialVotes: number }) {
  const [votes, setVotes] = useState(initialVotes);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const up = () => {
    setVotes((v) => v + (dir === "up" ? -1 : dir === "down" ? 2 : 1));
    setDir((d) => (d === "up" ? null : "up"));
  };
  const down = () => {
    setVotes((v) => v + (dir === "down" ? 1 : dir === "up" ? -2 : -1));
    setDir((d) => (d === "down" ? null : "down"));
  };
  return (
    <div className="flex w-12 flex-col items-center bg-gray-50 py-2 dark:bg-gray-800/50">
      <Button variant="ghost" size="icon" aria-label="Up‑vote" onClick={up}>
        <ArrowUp className="h-5 w-5" />
      </Button>
      <span className="text-sm font-semibold" aria-label="Vote count">
        {votes}
      </span>
      <Button variant="ghost" size="icon" aria-label="Down‑vote" onClick={down}>
        <ArrowDown className="h-5 w-5" />
      </Button>
    </div>
  );
}

/*****************************************************************
 * DATA SHAPES & MAPPERS
 *****************************************************************/
interface NewsItem {
  id: string;
  title: string;
  url: string;
  favicon: string;
  thumbnail: string | null;
  comments: number;
  votes: number;
  age: string;
  thread: string;
}
interface GNewsArticle {
  title?: string;
  url?: string;
  image?: string;
  source?: { name?: string; url?: string };
  publishedAt?: string;
}
function mapGNews(a: GNewsArticle, idx: number, topic: string): NewsItem {
  const {
    title = "Untitled",
    url = "#",
    image = null,
    source = {},
    publishedAt = new Date().toISOString(),
  } = a;
  const domain = source.url || (url && url !== "#" ? new URL(url).hostname : "");
  const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}` : "";
  const ageHours = Math.max(1, Math.round((Date.now() - new Date(publishedAt).getTime()) / 36e5));
  return {
    id: `${topic}-${idx}`,
    title,
    url,
    favicon,
    thumbnail: image,
    comments: 0,
    votes: 0,
    age: `${ageHours}h ago`,
    thread: topic,
  };
}

/*****************************************************************
 * FETCH HELPERS
 *****************************************************************/
async function fetchGNews({
  page,
  thread,
}: {
  page: number;
  thread: string | null;
}): Promise<NewsItem[]> {
  if (!GNEWS_TOKEN) throw new Error("Missing GNEWS_TOKEN env var");
  const params = new URLSearchParams({
    token: GNEWS_TOKEN,
    lang: "en",
    max: String(PAGE_SIZE),
    page: String(page),
  });
  if (thread) params.set("topic", thread);
  const res = await fetch(`https://gnews.io/api/v4/top-headlines?${params.toString()}`);
  if (!res.ok) throw new Error(`Network ${res.status}`);
  const json = await res.json();
  const arts: GNewsArticle[] = json.articles || [];
  return arts.map((a, idx) => mapGNews(a, (page - 1) * PAGE_SIZE + idx, thread || "all"));
}

/*****************************************************************
 * COMPONENTS – NEWS CARD
 *****************************************************************/
function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Card className="flex overflow-hidden">
      <VoteBar initialVotes={item.votes} />
      <CardContent className="flex flex-1 gap-4">
        {item.thumbnail && (
          <img src={item.thumbnail} alt="thumb" className="h-20 w-32 rounded-md object-cover" />
        )}
        <div className="flex flex-1 flex-col gap-1">
          <a href={item.url} target="_blank" rel="noopener" className="font-semibold">
            {item.title}
          </a>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {item.favicon && <img src={item.favicon} alt="icon" className="h-4 w-4" />}
            <span>{item.age}</span>
            <span>•</span>
            <span>{item.comments} comments</span>
          </div>
          <Badge>{item.thread}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/*****************************************************************
 * COMPONENTS – NEWS FEED
 *****************************************************************/
function NewsFeed({ thread }: { thread: string | null }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, [thread]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchGNews({ page, thread });
        if (cancelled) return;
        setItems((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, thread]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
      {error && <div className="col-span-full text-red-600">{error}</div>}
      {loading && <div className="col-span-full">Loading...</div>}
      {!loading && hasMore && (
        <div className="col-span-full flex justify-center">
          <Button onClick={() => setPage((p) => p + 1)}>Load more</Button>
        </div>
      )}
    </div>
  );
}

/*****************************************************************
 * THREAD TABS
 *****************************************************************/
function ThreadTabs({ thread, setThread }: { thread: string | null; setThread: (t: string | null) => void }) {
  const tabs = ["all", ...GNEWS_TOPICS];
  return (
    <div className="flex flex-wrap gap-2 py-4">
      {tabs.map((t) => (
        <Badge
          key={t}
          className={
            thread === (t === "all" ? null : t)
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "hover:bg-gray-200 dark:hover:bg-gray-700"
          }
          onClick={() => setThread(t === "all" ? null : t)}
        >
          {t}
        </Badge>
      ))}
    </div>
  );
}

/*****************************************************************
 * NAV BAR
 *****************************************************************/
function NavBar() {
  const { theme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white/80 px-4 py-2 backdrop-blur dark:border-gray-700 dark:bg-gray-900/80">
      <span className="text-xl font-bold">ThreadNews</span>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
        <input
          type="search"
          placeholder="Search threads"
          className="w-full rounded-md border bg-gray-50 py-2 pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
      <Button variant="outline" className="hidden sm:inline-flex">
        <LogIn className="mr-2 h-4 w-4" /> Log In
      </Button>
      <Button>
        <PlusCircle className="mr-2 h-4 w-4" /> Submit
      </Button>
    </header>
  );
}

/*****************************************************************
 * APP ROOT
 *****************************************************************/
function App() {
  const [thread, setThread] = useState<string | null>(null);
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 pb-10 dark:bg-gray-900">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4">
          <ThreadTabs thread={thread} setThread={setThread} />
          <NewsFeed thread={thread} />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
export { Button, Badge, Card, CardContent, App, useTheme };

