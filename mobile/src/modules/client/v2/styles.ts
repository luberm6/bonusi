import { StyleSheet, Dimensions } from "react-native";
import { mobileTokens } from "../../../../shared/design/tokens";

export const styles = StyleSheet.create({
  skeletonWrap: { gap: 16, padding: 20 },
  skeletonBlock: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden" },
  skeletonShimmer: { height: "100%", width: 80, backgroundColor: "rgba(255,255,255,0.03)" },
  loaderWrap: { padding: 40, alignItems: "center", gap: 12 },
  loaderText: { color: mobileTokens.color.textSecondary, fontSize: 13, fontWeight: "600" },

  // Brand & Welcome
  brandCard: {
    padding: 24,
    backgroundColor: "transparent",
    borderWidth: 0
  },
  brandTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: mobileTokens.color.textSecondary,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 8
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary,
    letterSpacing: -0.5
  },

  // Gauge area
  bonusCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
    overflow: "hidden"
  },
  gaugeContainer: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    overflow: "hidden"
  },
  gaugeImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 20,
    opacity: 0.5
  },
  bonusValue: {
    fontSize: 48,
    fontWeight: "800",
    color: mobileTokens.color.primary,
    textShadowColor: "rgba(162, 231, 255, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  bonusCaption: {
    fontSize: 10,
    fontWeight: "700",
    color: mobileTokens.color.secondary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 4
  },

  // Action Grid
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24
  },
  actionTile: {
    width: "48%",
    aspectRatio: 1,
    padding: 20,
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)"
  },
  actionTileBig: {
    width: "100%",
    aspectRatio: 4,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: mobileTokens.color.secondary,
    borderRadius: 20
  },
  actionTileLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  actionTileLabelDark: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
    marginLeft: 16
  },

  // Info Card
  infoCard: {
    marginHorizontal: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)"
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  infoSubtitle: {
    fontSize: 12,
    color: mobileTokens.color.textSecondary,
    marginTop: 2
  },

  // Navigation
  navBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(19, 19, 19, 1)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    zIndex: 9999,
    elevation: 8
  },
  navItem: {
    alignItems: "center",
    gap: 4
  },
  navLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: mobileTokens.color.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  navLabelActive: {
    color: mobileTokens.color.secondary
  },

  // Common
  screenWrap: { flex: 1, backgroundColor: mobileTokens.color.background },
  pageScroll: { flex: 1 },
  header: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)"
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary,
    letterSpacing: 4
  },
  weatherWidget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20
  },
  weatherText: {
    fontSize: 10,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary
  },
  root: {
    flex: 1,
    backgroundColor: mobileTokens.color.background
  },
  pressedSurface: {
    opacity: 0.7
  },
  pressedTile: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }]
  },
  toast: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 100000,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12
  },
  toastSuccess: {
    backgroundColor: "#10b981"
  },
  toastError: {
    backgroundColor: "#ef4444"
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700"
  },

  // Shared inner screens
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    minHeight: 56
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
    flex: 1
  },
  backButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: mobileTokens.color.secondary
  },
  pressedNav: {
    opacity: 0.6
  },
  screenTitle: {
    flex: 2,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  backButtonPlaceholder: {
    flex: 1
  },
  emptyCard: {
    margin: 20,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary,
    textAlign: "center"
  },
  emptyDescription: {
    fontSize: 14,
    color: mobileTokens.color.textSecondary,
    textAlign: "center",
    lineHeight: 20
  },

  // List Items
  listCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    gap: 8
  },
  visitCardPressable: {},
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  listSubtitle: {
    fontSize: 14,
    color: mobileTokens.color.textSecondary
  },
  visitServiceTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  visitServiceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 6
  },
  visitServiceTagText: {
    fontSize: 12,
    color: mobileTokens.color.textSecondary
  },
  visitSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)"
  },
  visitMetric: {
    gap: 4
  },
  visitMetricLabel: {
    fontSize: 12,
    color: mobileTokens.color.textSecondary
  },
  visitMetricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: mobileTokens.color.secondary
  },
  listHint: {
    fontSize: 12,
    color: mobileTokens.color.primary,
    marginTop: 8
  },
  listValue: {
    fontSize: 18,
    fontWeight: "800",
    color: mobileTokens.color.secondary,
    marginVertical: 4
  },

  // Details
  detailHeroCard: {
    margin: 16,
    padding: 24,
    gap: 8,
    alignItems: "center"
  },
  detailHeroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary
  },
  detailHeroSubtitle: {
    fontSize: 16,
    color: mobileTokens.color.textSecondary
  },
  detailHeroHint: {
    fontSize: 13,
    color: mobileTokens.color.textSecondary,
    marginTop: 4
  },
  detailTotalsCard: {
    marginHorizontal: 16,
    padding: 20
  },
  detailTotalsGrid: {
    gap: 16
  },
  detailTotalCell: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  detailTotalLabel: {
    fontSize: 14,
    color: mobileTokens.color.textSecondary
  },
  detailTotalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8
  },
  serviceCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    gap: 8
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary,
    marginBottom: 4
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  serviceLabel: {
    fontSize: 13,
    color: mobileTokens.color.textSecondary
  },
  serviceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: mobileTokens.color.textPrimary
  },

  // Cashback specific
  cashbackCard: {
    margin: 16,
    padding: 24,
    alignItems: "center",
    gap: 12
  },
  cashbackTitle: {
    fontSize: 14,
    color: mobileTokens.color.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  cashbackValue: {
    fontSize: 36,
    fontWeight: "800",
    color: mobileTokens.color.primary
  },
  cashbackHint: {
    fontSize: 14,
    color: mobileTokens.color.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 12
  },

  // Booking
  cardActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16
  },
  cardButton: {
    flex: 1
  },

  // Chat
  conversationTabs: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60
  },
  conversationTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    marginRight: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent"
  },
  conversationTabActive: {
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    borderColor: mobileTokens.color.secondary
  },
  pressedTab: {
    opacity: 0.7
  },
  conversationTabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: mobileTokens.color.textSecondary
  },
  conversationTabLabelActive: {
    color: mobileTokens.color.secondary
  },
  chatPanel: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 0,
    overflow: "hidden"
  },
  messagesList: {
    padding: 16,
    gap: 16,
    paddingBottom: 24
  },
  messagesEmpty: {
    padding: 40,
    alignItems: "center",
    gap: 12
  },
  messagesEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  messagesEmptyHint: {
    fontSize: 14,
    color: mobileTokens.color.textSecondary,
    textAlign: "center"
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16
  },
  messageMine: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0, 229, 255, 0.15)",
    borderBottomRightRadius: 4
  },
  messageOther: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderBottomLeftRadius: 4
  },
  messageText: {
    fontSize: 15,
    color: mobileTokens.color.textPrimary,
    lineHeight: 22
  },
  messageTextMine: {},
  messageMeta: {
    fontSize: 10,
    color: mobileTokens.color.textSecondary,
    marginTop: 6,
    alignSelf: "flex-end"
  },
  messageMetaMine: {
    color: "rgba(162, 231, 255, 0.6)"
  },
  chatComposer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(0,0,0,0.2)",
    gap: 12
  },
  chatInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: mobileTokens.color.textPrimary,
    fontSize: 15,
    minHeight: 44,
    maxHeight: 120
  },
  sendButton: {
    alignSelf: "flex-end"
  },

  // Skeletons list
  listTitleSkeleton: { width: "60%", height: 16, borderRadius: 8 },
  listSubtitleSkeleton: { width: "40%", height: 12, borderRadius: 6 },
  listValueSkeleton: { width: "80%", height: 18, borderRadius: 9, marginVertical: 8 },
  listHintSkeleton: { width: "50%", height: 10, borderRadius: 5 },

  // Chat Skeletons
  messageSkeletonLeft: { width: "70%", height: 50, borderRadius: 16, borderBottomLeftRadius: 4, alignSelf: "flex-start" },
  messageSkeletonRight: { width: "60%", height: 60, borderRadius: 16, borderBottomRightRadius: 4, alignSelf: "flex-end" },
  messageSkeletonLeftWide: { width: "85%", height: 80, borderRadius: 16, borderBottomLeftRadius: 4, alignSelf: "flex-start" },
  chatInputSkeleton: { flex: 1, height: 44, borderRadius: 20 },
  chatButtonSkeleton: { width: 100, height: 44, borderRadius: 22 }
});
