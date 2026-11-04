import { memo, useCallback, useMemo, useRef } from "react";
import { FlatList, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ensurePageFont, loadMushafPage } from "../../lib/mushaf/mushaf-assets";
import { LoadingState } from "../ui";
import MushafPage, { MUSHAF_COLORS, type MushafRecitationState } from "../mushaf/mushaf-page";

/** After the reciter scrolls by hand the page stays where they left it for this long. */
const FOLLOW_PAUSE_MS = 6_000;
/** The line being read rests this far down the screen, so the next lines are in view. */
const FOLLOW_LINE_AT = 0.25;

/**
 * The session's pages in one vertical scroll, first ayah at the top, down to the surah's end.
 * The view follows the line being read; scrolling by hand takes over for a few seconds.
 */
export function ContinuousPages({
  pages,
  currentPage,
  recitation,
  width,
  height,
}: {
  pages: number[];
  currentPage: number | undefined;
  recitation: Omit<MushafRecitationState, "onlyRange" | "onCurrentLine">;
  width: number;
  height: number;
}) {
  const listRef = useRef<FlatList<number>>(null);
  const heights = useRef(new Map<number, number>());
  const pausedUntil = useRef(0);

  const onCurrentLine = useCallback((page: number, top: number) => {
    if (Date.now() < pausedUntil.current) return;
    // Pages are read in order, so every page before this one has been measured.
    let pageTop = 0;
    for (const item of pages) {
      if (item >= page) break;
      pageTop += heights.current.get(item) ?? height;
    }
    listRef.current?.scrollToOffset({ offset: Math.max(0, pageTop + top - height * FOLLOW_LINE_AT), animated: true });
  }, [height, pages]);

  const state = useMemo<MushafRecitationState>(
    () => ({ ...recitation, onlyRange: true, onCurrentLine }),
    [recitation, onCurrentLine],
  );
  const pauseFollowing = useCallback(() => { pausedUntil.current = Date.now() + FOLLOW_PAUSE_MS; }, []);

  return (
    <FlatList
      ref={listRef}
      data={pages}
      extraData={state}
      keyExtractor={String}
      windowSize={5}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      onScrollBeginDrag={pauseFollowing}
      onScrollEndDrag={pauseFollowing}
      // Room to bring the surah's last lines up to the reading position.
      ListFooterComponent={<View style={{ height: height * 0.4 }} />}
      style={{ backgroundColor: MUSHAF_COLORS.paper }}
      renderItem={({ item }) => (
        <ContinuousPage
          page={item}
          // Only the pages around the reader change; the rest keep their state and skip rendering.
          active={currentPage === undefined || Math.abs(item - currentPage) <= 1}
          recitation={state}
          width={width}
          height={height}
          onHeight={(value) => heights.current.set(item, value)}
        />
      )}
    />
  );
}

const ContinuousPage = memo(function ContinuousPage({
  page,
  active,
  recitation,
  width,
  height,
  onHeight,
}: {
  page: number;
  active: boolean;
  recitation: MushafRecitationState;
  width: number;
  height: number;
  onHeight: (height: number) => void;
}) {
  const shown = useRef(recitation);
  if (active) shown.current = recitation;
  const query = useQuery({
    queryKey: ["mushaf-page", page],
    queryFn: async () => {
      const [data] = await Promise.all([loadMushafPage(page), ensurePageFont(page)]);
      return data;
    },
    staleTime: Infinity,
  });
  return (
    <View onLayout={(event) => onHeight(event.nativeEvent.layout.height)} style={{ alignItems: "center", minHeight: query.data ? undefined : height }}>
      {query.data
        ? <MushafPage data={query.data} width={width} height={height} fillWidth recitation={shown.current} />
        : <LoadingState label="جارٍ تحميل صفحة المصحف…" />}
    </View>
  );
});
