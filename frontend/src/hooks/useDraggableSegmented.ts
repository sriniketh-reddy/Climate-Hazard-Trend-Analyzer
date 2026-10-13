import React, { useState, useRef, useCallback, useMemo } from 'react';

export interface SegmentedOptionDef<T extends string> {
  value: T;
  width: number;
  disabled?: boolean;
}

interface UseDraggableSegmentedProps<T extends string> {
  options: SegmentedOptionDef<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function useDraggableSegmented<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: UseDraggableSegmentedProps<T>) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const startXRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerCapturedRef = useRef(false);

  // Compute layout offsets for each option
  const computedOptions = useMemo(() => {
    return options.map((opt, idx) => {
      let offset = 0;
      for (let i = 0; i < idx; i++) {
        offset += options[i].width;
      }
      return {
        ...opt,
        offset,
        center: offset + opt.width / 2,
      };
    });
  }, [options]);

  const activeIndex = Math.max(
    0,
    computedOptions.findIndex((opt) => opt.value === value)
  );
  const activeOption = computedOptions[activeIndex] || computedOptions[0];
  const maxOffset = computedOptions[computedOptions.length - 1]?.offset || 0;

  // Compute current display offset
  const currentOffset = isDragging && dragOffset !== null ? dragOffset : activeOption.offset;

  // When dragging, interpolate the width based on position between options
  let currentWidth = activeOption.width;
  if (isDragging && dragOffset !== null && computedOptions.length > 1) {
    for (let i = 0; i < computedOptions.length - 1; i++) {
      const optA = computedOptions[i];
      const optB = computedOptions[i + 1];
      if (dragOffset >= optA.offset && dragOffset <= optB.offset) {
        const range = optB.offset - optA.offset;
        const progress = range > 0 ? (dragOffset - optA.offset) / range : 0;
        currentWidth = optA.width + progress * (optB.width - optA.width);
        break;
      }
    }
    if (dragOffset > computedOptions[computedOptions.length - 1].offset) {
      currentWidth = computedOptions[computedOptions.length - 1].width;
    }
  }

  // Which option is covered by that bg right now (real-time during drag, or active value)
  const visualActiveValue = useMemo(() => {
    if (!isDragging || dragOffset === null) {
      return value;
    }
    const currentCenter = dragOffset + currentWidth / 2;
    let closestOpt = computedOptions[0];
    let minDist = Infinity;
    for (const opt of computedOptions) {
      const dist = Math.abs(currentCenter - opt.center);
      if (dist < minDist) {
        minDist = dist;
        closestOpt = opt;
      }
    }
    return closestOpt.value;
  }, [isDragging, dragOffset, currentWidth, computedOptions, value]);

  const isOptionActive = useCallback(
    (optValue: T) => {
      return optValue === visualActiveValue;
    },
    [visualActiveValue]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || e.button !== 0) return;

      activePointerIdRef.current = e.pointerId;
      pointerCapturedRef.current = false;
      startXRef.current = e.clientX;
      startOffsetRef.current = activeOption.offset;
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
    },
    [disabled, activeOption.offset]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || activePointerIdRef.current !== e.pointerId) return;

      const dx = e.clientX - startXRef.current;
      if (!hasDraggedRef.current && Math.abs(dx) > 4) {
        hasDraggedRef.current = true;
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointerCapturedRef.current = true;
        } catch {
          // Ignore if pointer capture fails
        }
      }

      if (hasDraggedRef.current) {
        const rawOffset = startOffsetRef.current + dx;
        const clampedOffset = Math.max(0, Math.min(maxOffset, rawOffset));
        setDragOffset(clampedOffset);
      }
    },
    [maxOffset]
  );

  const handlePointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || activePointerIdRef.current !== e.pointerId) return;

      const hadDragged = hasDraggedRef.current;
      const currentDragOffset = dragOffset;

      isDraggingRef.current = false;
      setIsDragging(false);
      activePointerIdRef.current = null;

      if (pointerCapturedRef.current) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
        pointerCapturedRef.current = false;
      }

      if (hadDragged && currentDragOffset !== null) {
        // Find nearest enabled option by center distance
        const currentCenter = currentDragOffset + currentWidth / 2;
        let bestOption = activeOption;
        let minDistance = Infinity;

        for (const opt of computedOptions) {
          if (opt.disabled) continue;
          const dist = Math.abs(currentCenter - opt.center);
          if (dist < minDistance) {
            minDistance = dist;
            bestOption = opt;
          }
        }

        if (bestOption.value !== value && !bestOption.disabled) {
          onChange(bestOption.value);
        }
      } else {
        // Was a simple click on the container or button
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left - 4; // 4px padding
        let clickedOpt = computedOptions.find(
          (opt) => clickX >= opt.offset && clickX <= opt.offset + opt.width
        );
        if (!clickedOpt) {
          let minD = Infinity;
          for (const opt of computedOptions) {
            const d = Math.abs(clickX - opt.center);
            if (d < minD) {
              minD = d;
              clickedOpt = opt;
            }
          }
        }
        if (clickedOpt && !clickedOpt.disabled) {
          onChange(clickedOpt.value);
        }
      }

      setDragOffset(null);
    },
    [dragOffset, currentWidth, activeOption, computedOptions, value, onChange]
  );

  const handleButtonClick = useCallback(
    (targetVal: T, optDisabled?: boolean) => {
      if (optDisabled) return;
      onChange(targetVal);
    },
    [onChange]
  );

  return {
    containerProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      style: {
        touchAction: 'none' as const,
        userSelect: 'none' as const,
      },
    },
    indicatorStyle: {
      transform: `translate3d(${currentOffset}px, 0, 0)`,
      width: `${currentWidth}px`,
      transition: isDragging
        ? 'none'
        : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), width 300ms cubic-bezier(0.16, 1, 0.3, 1)',
    },
    contentMaskStyle: {
      transform: `translate3d(-${currentOffset}px, 0, 0)`,
      transition: isDragging
        ? 'none'
        : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
    },
    currentOffset,
    currentWidth,
    isDragging,
    visualActiveValue,
    isOptionActive,
    handleButtonClick,
  };
}
