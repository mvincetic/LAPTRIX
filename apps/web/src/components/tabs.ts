export const tabId = (prefix: string, index: number) =>
  `${prefix}-tab-${index}`;
export const panelId = (prefix: string, index: number) =>
  `${prefix}-panel-${index}`;

export function tabPanelProps(
  prefix: string,
  index: number,
  selected: boolean,
) {
  return {
    id: panelId(prefix, index),
    role: "tabpanel" as const,
    "aria-labelledby": tabId(prefix, index),
    hidden: !selected,
    tabIndex: 0,
  };
}
