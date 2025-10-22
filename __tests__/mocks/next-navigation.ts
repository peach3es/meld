export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  refresh: () => {},
  prefetch: () => Promise.resolve(),
});

export const useSearchParams = () => new URLSearchParams();

export const usePathname = () => "/";

export const useParams = () => ({});
