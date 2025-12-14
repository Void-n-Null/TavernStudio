import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { LayoutConfig, MessageListBackgroundConfig } from '../../../types/messageStyle';
import { gapMap, type GradientDirection } from '../../../types/messageStyle';

export function useMessageListVisualStyles({
  messageListBg,
  layoutConfig,
  showMessageDividers,
}: {
  messageListBg: MessageListBackgroundConfig;
  layoutConfig: LayoutConfig;
  showMessageDividers: boolean;
}): {
  messageListContainerStyle: CSSProperties;
  messageListContentStyle: CSSProperties;
  separatorStyles: {
    messageGapPx: string;
    groupGapPx: string;
    dividerMessage: CSSProperties;
    dividerGroup: CSSProperties;
    spacer: CSSProperties;
  };
} {
  // Compute message list background style
  const gradientDirectionMap: Record<GradientDirection, string> = {
    'to-bottom': 'to bottom',
    'to-top': 'to top',
    'to-right': 'to right',
    'to-left': 'to left',
    'to-bottom-right': 'to bottom right',
    'to-bottom-left': 'to bottom left',
  };

  // Helper to apply opacity to a color (supports hex, rgb, rgba)
  const applyOpacityToColor = (color: string | undefined, opacity: number): string => {
    if (!color) return `rgba(0, 0, 0, ${opacity})`;
    // If already rgba, adjust the alpha
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, `${opacity})`);
    }
    // If rgb, convert to rgba
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    // If hex, convert to rgba
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };

  const messageListBackgroundStyle: CSSProperties = useMemo(() => {
    if (!messageListBg.enabled) return {};

    const opacity = messageListBg.opacity / 100;
    const baseStyle: CSSProperties = {
      borderRadius: '0px',
    };

    // Add backdrop blur if set
    if (messageListBg.blur > 0) {
      baseStyle.backdropFilter = `blur(${messageListBg.blur}px)`;
      baseStyle.WebkitBackdropFilter = `blur(${messageListBg.blur}px)`;
    }

    if (messageListBg.type === 'none') {
      return baseStyle;
    }

    if (messageListBg.type === 'color') {
      // Apply opacity directly to the color, not the container
      return {
        ...baseStyle,
        backgroundColor: applyOpacityToColor(messageListBg.color, opacity),
      };
    }

    if (messageListBg.type === 'gradient') {
      const direction = gradientDirectionMap[messageListBg.gradientDirection];
      // Apply opacity to gradient colors
      const fromColor = applyOpacityToColor(messageListBg.gradientFrom, opacity);
      const toColor = applyOpacityToColor(messageListBg.gradientTo, opacity);
      return {
        ...baseStyle,
        background: `linear-gradient(${direction}, ${fromColor}, ${toColor})`,
      };
    }

    return baseStyle;
  }, [messageListBg]);

  // Divider + spacer styles (used when dividers are enabled)
  const separatorStyles = useMemo(() => {
    const messageGapPx = gapMap[layoutConfig.messageGap] ?? '0px';
    const groupGapPx = gapMap[layoutConfig.groupGap] ?? messageGapPx;

    const opacity = (layoutConfig.dividerOpacity ?? 0) / 100;
    const bg = applyOpacityToColor(layoutConfig.dividerColor, opacity);
    const width = `${Math.max(0, Math.min(100, layoutConfig.dividerWidth ?? 100))}%`;

    const baseDivider: CSSProperties = {
      height: '1px',
      backgroundColor: bg,
      width,
      margin: '0 auto',
      flexShrink: 0,
    };

    const dividerForGap = (gapPx: string): CSSProperties => {
      // Center the divider within the intended gap.
      // Use padding to ensure the divider doesn't overlap message content.
      return {
        ...baseDivider,
        marginTop: `calc(${gapPx} / 2)`,
        marginBottom: `calc(${gapPx} / 2)`,
      };
    };

    const spacer: CSSProperties = {
      height: messageGapPx,
    };

    return {
      messageGapPx,
      groupGapPx,
      dividerMessage: dividerForGap(messageGapPx),
      dividerGroup: dividerForGap(groupGapPx),
      spacer,
    };
  }, [layoutConfig]);

  // When dividers are enabled, we want *divider-controlled* spacing (not the fixed CSS gap).
  const messageListContainerStyle: CSSProperties = useMemo(() => {
    return {
      ...messageListBackgroundStyle,
    };
  }, [messageListBackgroundStyle]);

  const messageListContentStyle: CSSProperties = useMemo(() => {
    // `.message-list-content` owns the fixed CSS gap; when dividers are enabled, we zero it out
    // so spacing comes from the divider renderer instead.
    return showMessageDividers ? { gap: 0 } : {};
  }, [showMessageDividers]);

  return {
    messageListContainerStyle,
    messageListContentStyle,
    separatorStyles,
  };
}
