import { memo, useEffect, useRef, useState } from "react";
import { PANEL_TRANSITION_MS } from "../hooks/useRisingPanel";
import { cx } from "../utils/cx";
import { About } from "./About";
import { Career } from "./Career";
import { Contact } from "./Contact";
import { Header } from "./Header";
import { Projects } from "./Projects";
import { Skills } from "./Skills";
import styles from "./SectionsPanel.module.css";

/** 맨 위로 봤을 때 이 정도 오차는 맨 위로 친다. */
const TOP_TOLERANCE = 1;
/** 맨 위에서 이만큼 되돌리면 첫 화면으로 내려간다. (올라올 때와 같은 기준) */
const WHEEL_THRESHOLD = 8;
const TOUCH_THRESHOLD = 36;
/**
 * 휠 사이가 이만큼 벌어지면 새로 굴리기 시작한 것으로 본다.
 * 아래에서 위로 휙 쓸어 올렸을 때, 남은 관성이 맨 위에 닿자마자
 * 그대로 첫 화면까지 튕겨 나가는 것을 막는다.
 */
const GESTURE_GAP_MS = 140;
/** 미리 그릴 한 프레임을 기다리는 시간의 상한. 프레임이 오지 않아도 올라간다. */
const PREPARE_FALLBACK_MS = 60;

interface SectionsPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 01~05 섹션이 담긴 두 번째 화면.
 *
 * - 첫 화면에서 아래로 굴리면 이 패널이 올라와 화면을 채운다.
 * - 패널 안에서는 평범하게 스크롤된다.
 * - **맨 위에서** 한 번 더 위로 굴리면(또는 Esc) 다시 내려가 첫 화면이 나온다.
 */
export function SectionsPanel({ open, onClose }: SectionsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  /** 렌더링만 미리 끝내 둔 상태. 아직 화면 아래에 있다. */
  const [prepared, setPrepared] = useState(false);
  /** 실제로 올라간 상태. transform 만 바뀐다. */
  const [raised, setRaised] = useState(false);

  /*
   * 올리기 전에 한 프레임을 내줘서 브라우저가 섹션을 미리 그려 두게 한다.
   * (닫혀 있는 동안 섹션은 content-visibility 로 렌더링을 건너뛰고 있다.)
   * 그리기와 올리기가 같은 프레임에 겹치면 처음 몇 프레임이 끊겨 보인다.
   */
  useEffect(() => {
    if (!open) {
      setRaised(false);
      // 다 내려간 뒤에 다시 건너뛰기 모드로 돌아간다.
      const timer = window.setTimeout(() => setPrepared(false), PANEL_TRANSITION_MS);
      return () => window.clearTimeout(timer);
    }

    setPrepared(true);

    let frame = 0;
    let fallback = 0;

    const raise = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
      setRaised(true);
    };

    // 한 프레임 뒤에 올린다. 프레임이 오지 않는 상황을 대비해 타이머도 함께 건다.
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(raise);
    });
    fallback = window.setTimeout(raise, PREPARE_FALLBACK_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, [open]);

  // 다 내려간 다음에 스크롤 위치를 되돌린다. 내려가는 중에 되돌리면 티가 난다.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || open) return;

    const timer = window.setTimeout(() => {
      panel.scrollTop = 0;
    }, PANEL_TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [open]);

  // 열려 있을 때만 닫는 입력을 듣는다.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !open) return;

    /** 맨 위에 서 있어야 닫을 수 있다. 그 전에는 평범한 스크롤이다. */
    const atTop = () => panel.scrollTop <= TOP_TOLERANCE;

    let intent = 0;
    let touchStartY = 0;

    /** 지금 굴리기 시작한 동작이 맨 위에서 출발했는가. 그때만 닫는다. */
    let fromTop = atTop();
    let lastWheelAt = -GESTURE_GAP_MS;

    const handleWheel = (event: WheelEvent) => {
      // 한동안 조용했으면 새로 굴리기 시작한 것이다.
      if (event.timeStamp - lastWheelAt > GESTURE_GAP_MS) {
        fromTop = atTop();
        intent = 0;
      }
      lastWheelAt = event.timeStamp;

      if (!fromTop || event.deltaY >= 0 || !atTop()) {
        intent = 0;
        return;
      }
      intent += -event.deltaY;
      if (intent > WHEEL_THRESHOLD) {
        intent = 0;
        closeRef.current();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
      fromTop = atTop();
    };

    const handleTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? touchStartY;
      if (!fromTop || !atTop()) {
        touchStartY = y;
        return;
      }
      if (y - touchStartY > TOUCH_THRESHOLD) closeRef.current();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Escape") {
        closeRef.current();
        return;
      }

      if ((event.key === "ArrowUp" || event.key === "PageUp") && atTop()) {
        event.preventDefault();
        closeRef.current();
      }
    };

    panel.addEventListener("wheel", handleWheel, { passive: true });
    panel.addEventListener("touchstart", handleTouchStart, { passive: true });
    panel.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      panel.removeEventListener("wheel", handleWheel);
      panel.removeEventListener("touchstart", handleTouchStart);
      panel.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={panelRef}
      className={cx(
        styles.panel,
        prepared && styles.prepared,
        raised && styles.open,
      )}
      inert={!open}
    >
      <PanelContent />
    </div>
  );
}

/**
 * 패널 안의 내용. 여닫는 상태와 무관하므로 memo 로 묶어 둔다.
 * 올라오는 프레임에 React 가 섹션 전체를 다시 그리지 않게 하려는 것이다.
 */
const PanelContent = memo(function PanelContent() {
  return (
    <>
      <Header />

      <main id="top">
        <About />
        <Skills />
        <Projects />
        <Career />
        <Contact />
      </main>
    </>
  );
});
