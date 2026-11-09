**1. When would you use Server and Client Components?**

I’d keep the page layout, headings, and initial translation loading on the server. The filter controls, interactive table, and editable drawer need Client Components because they use state, event handlers, and TanStack Query. I’d draw the boundary around that interactive workspace so the rest of the page can stay server-rendered.

**2. When would you fetch on the server, and how would you avoid fetching twice?**

I’d fetch on the server when having data in the first response noticeably improves the initial experience, provided authentication is available there. I’d prefetch into a request-scoped QueryClient, dehydrate it, and pass the result through a HydrationBoundary. The client would use the same query key and a suitable staleTime so it can reuse that data without immediately fetching again.

**3. How would you handle a 409 Conflict?**

I’d keep the drawer open, preserve everything the user typed, and explain that someone else updated the record. Loading the latest version would refresh the detail cache while keeping the draft separate, so the user can compare both versions. After they explicitly choose how to proceed, the next save would use the reviewed version, and a successful save would update the detail cache and invalidate the lists.

**4. Where should filters, sorting, and pagination live?**

I’d keep them in URL search parameters so refreshing, sharing a link, and using Back or Forward restore the same view. I’d normalize those parameters once and use that result for both the controls and the query key. Search typing would replace the current history entry after a short debounce, while filter, sort, and page changes would add entries; changing the search or filters would also reset pagination.

**5. How would you attach and refresh access tokens?**

I’d attach the token centrally in the typed client, using a getter that reads the current token when each request starts. For a real identity provider, I’d use its SDK to renew an expired token, coordinate concurrent refresh attempts, and retry the failed request once where safe. If renewal fails, I’d clear the session and user-specific cache and return to sign-in. Tokens must stay out of URLs, query keys, logs, error messages, and serialized page data.

**6. How would you structure loading, error, and empty states?**

I’d use loading.tsx for route-level loading and error.tsx for unexpected errors in the route subtree. Inside the workspace, the table and drawer would handle their own query loading, retry, and empty or missing-record states, so a drawer failure leaves the table usable. Suspense boundaries would wrap sections that actually suspend; regular useQuery loading needs explicit UI handling. During filter changes, I’d keep the table mounted and show an updating indicator with the previous results.

**7. How would you support Dutch and English?**

I’d resolve the selected language on the server from a cookie or locale segment and load its dictionary there. Server Components would use that dictionary directly, and a client provider would receive the selected translations for interactive components. Dates and numbers would use Intl with the same locale and an explicit timezone where needed. I’d also store validation error identifiers rather than translated strings so existing errors update when the language changes.

**8. What would you measure before calling a page slow?**

I’d first separate slow initial loading from slow interactions, then inspect response times, the request waterfall, JavaScript size, and React render timings. I’d also check LCP and INP using a production build, ideally backed by real-user measurements. Two App Router features I’d consider are Server Components to reduce browser-side JavaScript and Suspense streaming to let independent sections appear as their data becomes available. The measurements would determine which change is worth making.

**9. How would you test this feature?**

I’d unit test URL normalization, query keys, and validation because those rules are small and easy to isolate. Component tests would cover filtering, loading and retry states, and the full conflict flow, especially preserving drafts and submitting the correct version. I’d use end-to-end tests for browser-dependent behavior such as sign-in, refresh, Back/Forward, drawer focus, and two-tab conflicts. That gives fast feedback on the logic while checking that the important user journeys work together.
