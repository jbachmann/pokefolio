import { useWindowWidth } from "@/hooks/use-window-width";
import React, { useState } from "react";
import {
  DimensionValue,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Image } from "expo-image";
import { analyzeTeam, effectiveness } from "@/lib/api";
import { art, C, font, title } from "@/lib/theme";
import { Header, Footer, layout } from "@/components/shell";
import {
  Button,
  FadeIn,
  Icon,
  IconButton,
  Pokeball,
  Sheet,
  T,
  TypeBadge,
} from "@/components/ui";
import { Team, useStore } from "@/providers/store";

function TeamAnalysis({ team }: { team: Team }) {
  const width = useWindowWidth();
  const mobile = width < 750;
  const [tab, setTab] = useState<"defense" | "offense">("defense");
  const matchups = analyzeTeam(team.members);
  const covered = matchups.filter((t) => t.coverage > 0);
  const risks = matchups
    .filter((t) => t.weak > t.resistant)
    .sort((a, b) => b.weak - b.resistant - (a.weak - a.resistant));
  const strong = matchups
    .filter((t) => t.resistant > 0)
    .sort((a, b) => b.resistant - a.resistant);
  const totals = Array.from({ length: 6 }, (_, i) =>
    team.members.reduce((sum, p) => sum + p.stats[i], 0),
  );
  return (
    <FadeIn key={team.id}>
      <View style={[styles.insights, mobile && { flexDirection: "column" }]}>
        <View style={[styles.insight, { backgroundColor: "#EAF0E0" }]}>
          <Icon name="flash-outline" size={23} color="#729362" />
          <T style={styles.insightLabel}>OFFENSIVE COVERAGE</T>
          <T style={styles.bigNumber}>
            {covered.length}
            <T style={{ color: C.muted, fontSize: 19 }}> / 18 types</T>
          </T>
          <T style={styles.insightText}>
            Types hit super effectively by your team’s own types.
          </T>
        </View>
        <View style={[styles.insight, { backgroundColor: "#F6EDE1" }]}>
          <Icon name="shield-half-outline" size={23} color="#BC9368" />
          <T style={styles.insightLabel}>WATCH YOUR STEP</T>
          <T style={styles.bigNumber}>
            {risks.length}
            <T style={{ color: C.muted, fontSize: 19 }}> type risks</T>
          </T>
          <T style={styles.insightText}>
            {risks.length
              ? risks
                  .slice(0, 3)
                  .map((t) => title(t.type))
                  .join(", ") + " have more weak members than resistant ones."
              : "Every type has at least as many resistant partners as weak partners."}
          </T>
        </View>
        <View style={[styles.insight, { backgroundColor: "#E8EEF0" }]}>
          <Icon name="stats-chart-outline" size={23} color="#7A9C9E" />
          <T style={styles.insightLabel}>TEAM BASE STAT TOTAL</T>
          <T style={styles.bigNumber}>
            {totals.reduce((a, b) => a + b, 0).toLocaleString("en-US")}
          </T>
          <T style={styles.insightText}>
            An average of{" "}
            {Math.round(
              totals.reduce((a, b) => a + b, 0) / team.members.length,
            )}{" "}
            base stat points per Pokémon.
          </T>
        </View>
      </View>
      <View style={styles.analysisPanel}>
        <View style={styles.panelHeading}>
          <View>
            <T style={styles.sectionTitle}>A team is more than its parts.</T>
            <T style={styles.helper}>
              Understand where your partners shine, and where they need support.
            </T>
          </View>
          <View style={styles.tabs}>
            {(["defense", "offense"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
                style={[styles.tab, tab === t && { backgroundColor: C.green }]}
              >
                <T
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: tab === t ? "#fff" : C.muted,
                  }}
                >
                  {t === "defense" ? "Defense" : "Offense"}
                </T>
              </Pressable>
            ))}
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          <View>
            <View style={styles.matrixRow}>
              <View style={styles.matrixLabel}>
                <T style={styles.matrixHeading}>
                  {tab === "defense" ? "INCOMING ATTACK" : "OPPOSING TYPE"}
                </T>
              </View>
              {team.members.map((p) => (
                <View key={p.id} style={styles.matrixCell}>
                  <Image
                    source={{ uri: art(p.id) }}
                    style={{ width: 45, height: 45 }}
                    contentFit="contain"
                  />
                  <T style={{ fontSize: 9 }} numberOfLines={1}>
                    {title(p.name)}
                  </T>
                </View>
              ))}
              <View style={styles.matrixCell}>
                <T style={styles.matrixHeading}>
                  {tab === "defense" ? "WEAK / RESIST" : "COVERAGE"}
                </T>
              </View>
            </View>
            {matchups.map((m) => (
              <View key={m.type} style={styles.matrixRow}>
                <View style={styles.matrixLabel}>
                  <TypeBadge type={m.type} small />
                </View>
                {team.members.map((p) => {
                  const value =
                    tab === "defense"
                      ? effectiveness(m.type, p.types)
                      : Math.max(
                          ...p.types.map((t) => effectiveness(t, [m.type])),
                        );
                  const good = tab === "defense" ? value < 1 : value > 1;
                  const bad = tab === "defense" ? value > 1 : value < 1;
                  return (
                    <View style={styles.matrixCell} key={p.id}>
                      <View
                        style={[
                          styles.multiplier,
                          {
                            backgroundColor: good
                              ? "#E0EDD7"
                              : bad
                                ? "#F5DED5"
                                : "#F0F1E9",
                          },
                        ]}
                      >
                        <T
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: good
                              ? "#5A8147"
                              : bad
                                ? "#BD7A61"
                                : "#A5AB9A",
                          }}
                        >
                          {value === 1 ? "—" : value + "×"}
                        </T>
                      </View>
                    </View>
                  );
                })}
                <View style={styles.matrixCell}>
                  <T
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color:
                        tab === "defense" && m.weak > m.resistant
                          ? C.red
                          : C.green,
                    }}
                  >
                    {tab === "defense"
                      ? m.weak + " / " + m.resistant
                      : m.coverage + " / " + team.members.length}
                  </T>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <View
          style={{
            flexDirection: "row",
            gap: 18,
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          <T style={{ fontSize: 10, color: "#779361" }}>● Advantage</T>
          <T style={{ fontSize: 10, color: "#BC7B62" }}>● Disadvantage</T>
          <T style={{ fontSize: 10, color: C.muted }}>— Neutral (1×)</T>
        </View>
        <T
          style={{
            fontSize: 10,
            color: C.muted,
            lineHeight: 18,
            marginTop: 12,
          }}
        >
          {tab === "defense"
            ? "Dual-type multipliers are multiplied, including ¼×, 4×, and immunities (0×). Resist counts include immunities."
            : "Shows the best multiplier from each Pokémon’s own types against a single defending type. Coverage is the number of members that can deal 2× damage."}{" "}
          Type-based analysis excludes movesets, abilities, items, and battle
          conditions.
        </T>
      </View>
      <View style={[styles.lowerPanels, mobile && { flexDirection: "column" }]}>
        <View style={[styles.analysisPanel, { flex: 1, marginTop: 0 }]}>
          <T style={styles.sectionTitle}>Stronger together.</T>
          <T style={styles.helper}>Your most dependable defensive matchups.</T>
          {strong.slice(0, 5).map((m) => (
            <View key={m.type} style={styles.strengthRow}>
              <TypeBadge type={m.type} small />
              <T style={{ color: C.muted, fontSize: 11 }}>
                {m.resistant} resist
                {m.immune ? " · " + m.immune + " immune" : ""}
              </T>
            </View>
          ))}
          {!strong.length && (
            <T style={styles.helper}>
              Add a partner with a type resistance to see it here.
            </T>
          )}
        </View>
        <View style={[styles.analysisPanel, { flex: 1, marginTop: 0 }]}>
          <T style={styles.sectionTitle}>Team stat profile.</T>
          <T style={styles.helper}>
            Combined base stats for all {team.members.length} partners.
          </T>
          {[
            "HP",
            "Attack",
            "Defense",
            "Sp. Attack",
            "Sp. Defense",
            "Speed",
          ].map((stat, i) => (
            <View
              key={stat}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginTop: 17,
              }}
            >
              <T style={{ width: 73, fontSize: 11, color: C.muted }}>{stat}</T>
              <T style={{ width: 32, fontSize: 11, fontWeight: "600" }}>
                {totals[i]}
              </T>
              <View
                style={{
                  flex: 1,
                  height: 6,
                  backgroundColor: C.soft,
                  borderRadius: 8,
                }}
              >
                <View
                  style={{
                    width: ((totals[i] / (255 * team.members.length)) * 100 +
                      "%") as DimensionValue,
                    height: "100%",
                    backgroundColor: "#91A97B",
                    borderRadius: 8,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </FadeIn>
  );
}
export default function Teams() {
  const width = useWindowWidth();
  const mobile = width < 650;
  const {
    teams,
    ready,
    createTeam,
    renameTeam,
    deleteTeam,
    removeMember,
    notify,
  } = useStore();
  const [selectedId, setSelectedId] = useState("");
  const [edit, setEdit] = useState<"new" | "rename" | null>(null);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const team = teams.find((t) => t.id === selectedId) ?? teams[0];
  function save() {
    if (!name.trim() || !ready) return;
    if (edit === "new") setSelectedId(createTeam(name));
    else if (team) renameTeam(team.id, name);
    setEdit(null);
  }
  return (
    <View style={layout.page}>
      <Header />
      <ScrollView
        contentContainerStyle={[layout.container, mobile && layout.mobile]}
      >
        <View
          style={[
            styles.top,
            mobile && { flexDirection: "column", alignItems: "flex-start" },
          ]}
        >
          <View style={{ flexShrink: 1 }}>
            <T style={styles.kicker}>YOUR NEXT GREAT ADVENTURE</T>
            <T style={[styles.pageTitle, mobile && { fontSize: 36 }]}>
              Good company. Great possibilities.
            </T>
            <T style={styles.pageSubtitle}>
              Find your balance. Play to your strengths. Make a team that feels
              like you.
            </T>
          </View>
          <Button
            icon="add"
            disabled={!ready}
            onPress={() => {
              setName("");
              setEdit("new");
            }}
          >
            Create a team
          </Button>
        </View>
        {!team ? (
          <FadeIn>
            <View style={styles.empty}>
              <View
                style={{ flexDirection: "row", gap: 0, alignItems: "center" }}
              >
                {[1, 4, 7].map((id, i) => (
                  <Image
                    key={id}
                    source={{ uri: art(id) }}
                    style={{
                      width: mobile ? 100 : 150,
                      height: mobile ? 120 : 160,
                      transform: [{ translateY: i === 1 ? -15 : 0 }],
                    }}
                    contentFit="contain"
                  />
                ))}
              </View>
              <T
                style={{
                  fontFamily: font.display,
                  fontSize: 32,
                  fontWeight: "500",
                  marginTop: 14,
                  textAlign: "center",
                }}
              >
                Every adventure starts with a friend.
              </T>
              <T
                style={{
                  color: C.muted,
                  lineHeight: 23,
                  maxWidth: 350,
                  textAlign: "center",
                  marginTop: 13,
                  marginBottom: 25,
                }}
              >
                Choose up to six Pokémon. We’ll help you discover their combined
                strengths, weaknesses, and a little team magic.
              </T>
              <Button
                onPress={() => {
                  setName("");
                  setEdit("new");
                }}
                disabled={!ready}
                icon="add"
              >
                Build your first team
              </Button>
            </View>
          </FadeIn>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.teamTabs}
            >
              {teams.map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: team.id === t.id }}
                  onPress={() => setSelectedId(t.id)}
                  style={[
                    styles.teamTab,
                    team.id === t.id && {
                      backgroundColor: C.green,
                      borderColor: C.green,
                    },
                  ]}
                >
                  <Pokeball
                    size={16}
                    color={team.id === t.id ? C.lime : "#9EAC90"}
                    lineColor={team.id === t.id ? C.green : C.bg}
                  />
                  <T
                    style={{
                      color: team.id === t.id ? "#fff" : C.ink,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {t.name}
                  </T>
                  <T
                    style={{
                      color: team.id === t.id ? "#BDD0A9" : C.muted,
                      fontSize: 10,
                    }}
                  >
                    {t.members.length}/6
                  </T>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.roster}>
              <View style={styles.panelHeading}>
                <View>
                  <T style={styles.sectionTitle}>{team.name}</T>
                  <T style={styles.helper}>
                    {team.members.length} of 6 partners · Saved on this device
                  </T>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <IconButton
                    name="pencil-outline"
                    label="Rename team"
                    onPress={() => {
                      setName(team.name);
                      setEdit("rename");
                    }}
                  />
                  <IconButton
                    name="trash-outline"
                    label="Delete team"
                    color="#B18A78"
                    onPress={() => setConfirmDelete(true)}
                  />
                </View>
              </View>
              <View style={[styles.slots, { gap: mobile ? 10 : 15 }]}>
                {Array.from({ length: 6 }, (_, i) => {
                  const p = team.members[i];
                  return (
                    <View
                      key={i}
                      style={{
                        width: mobile
                          ? "47.5%"
                          : width < 1000
                            ? "30.8%"
                            : "15.5%",
                      }}
                    >
                      {p ? (
                        <View style={styles.member}>
                          <IconButton
                            name="close"
                            label={"Remove " + p.name + " from team"}
                            onPress={() => {
                              removeMember(team.id, p.id);
                              notify(title(p.name) + " left the team.");
                            }}
                            style={{
                              position: "absolute",
                              right: 2,
                              top: 2,
                              width: 30,
                              height: 30,
                              zIndex: 2,
                            }}
                          />
                          <Link
                            href={{
                              pathname: "/pokemon/[id]",
                              params: { id: p.id },
                            }}
                            asChild
                          >
                            <Pressable style={{ alignItems: "center" }}>
                              <Image
                                source={{ uri: art(p.id) }}
                                style={{ width: 95, height: 95 }}
                                contentFit="contain"
                              />
                              <T
                                style={{
                                  fontFamily: font.display,
                                  fontSize: 17,
                                  fontWeight: "600",
                                  marginBottom: 8,
                                }}
                                numberOfLines={1}
                              >
                                {title(p.name)}
                              </T>
                              <View style={{ flexDirection: "row", gap: 3 }}>
                                {p.types.map((t) => (
                                  <TypeBadge small type={t} key={t} />
                                ))}
                              </View>
                            </Pressable>
                          </Link>
                        </View>
                      ) : (
                        <Link href="/" asChild>
                          <Pressable style={styles.emptySlot}>
                            <View
                              style={{
                                width: 35,
                                height: 35,
                                borderRadius: 20,
                                backgroundColor: "#EDF0E5",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Icon name="add" size={22} color="#92A27E" />
                            </View>
                            <T
                              style={{
                                fontSize: 11,
                                color: "#92A27E",
                                marginTop: 14,
                              }}
                            >
                              Find a partner
                            </T>
                            <T
                              style={{
                                fontSize: 9,
                                color: "#B5BCA9",
                                marginTop: 5,
                              }}
                            >
                              SLOT {i + 1}
                            </T>
                          </Pressable>
                        </Link>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
            {team.members.length ? (
              <TeamAnalysis team={team} />
            ) : (
              <View
                style={{ paddingVertical: 60, alignItems: "center", gap: 16 }}
              >
                <Icon name="sparkles-outline" size={30} color="#91A67B" />
                <T
                  style={{
                    fontFamily: font.display,
                    fontSize: 26,
                    textAlign: "center",
                  }}
                >
                  A blank page. A world of potential.
                </T>
                <T
                  style={{
                    color: C.muted,
                    textAlign: "center",
                    lineHeight: 22,
                  }}
                >
                  Add your first Pokémon to bring your team analysis to life.
                </T>
                <Link href="/" asChild>
                  <Pressable
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                    }}
                  >
                    <T style={{ fontWeight: "700" }}>Explore the Pokédex</T>
                    <Icon name="arrow-forward" size={17} />
                  </Pressable>
                </Link>
              </View>
            )}
          </>
        )}
        <Footer />
      </ScrollView>
      <Sheet
        visible={!!edit}
        onClose={() => setEdit(null)}
        heading={
          edit === "new"
            ? "Name your next adventure."
            : "A new name, same great team."
        }
      >
        <T style={{ color: C.muted, lineHeight: 22, marginBottom: 20 }}>
          Something memorable for your favorite little crew.
        </T>
        <TextInput
          accessibilityLabel="Team name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. The Evergreen Six"
          placeholderTextColor={C.muted}
          maxLength={40}
          autoFocus
          style={styles.input}
          onSubmitEditing={save}
          returnKeyType="done"
        />
        <Button
          style={{ marginTop: 15 }}
          onPress={save}
          disabled={!name.trim()}
          icon={edit === "new" ? "add" : "checkmark"}
        >
          {edit === "new" ? "Create team" : "Save name"}
        </Button>
      </Sheet>
      <Sheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        heading="Part ways with this team?"
      >
        <T style={{ color: C.muted, lineHeight: 23, marginBottom: 24 }}>
          This will remove {team?.name} from this device. You can always start a
          new adventure.
        </T>
        <Button
          onPress={() => {
            if (team) deleteTeam(team.id);
            setConfirmDelete(false);
            notify("Team removed. A new adventure awaits.");
          }}
          style={{ backgroundColor: C.red }}
        >
          Delete team
        </Button>
        <Button
          onPress={() => setConfirmDelete(false)}
          variant="outline"
          style={{ marginTop: 10 }}
        >
          Keep my team
        </Button>
      </Sheet>
    </View>
  );
}
const styles = StyleSheet.create({
  top: {
    marginTop: 44,
    marginBottom: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 25,
  },
  kicker: { fontSize: 9, letterSpacing: 2, color: "#879975", marginBottom: 12 },
  pageTitle: {
    fontFamily: font.display,
    fontSize: 39,
    fontWeight: "500",
    letterSpacing: -1.1,
    maxWidth: 700,
  },
  pageSubtitle: { fontSize: 12, color: C.muted, lineHeight: 22, marginTop: 10 },
  empty: {
    alignItems: "center",
    paddingVertical: 70,
    paddingHorizontal: 15,
    backgroundColor: "#EEF1E6",
    borderRadius: 22,
    marginTop: 10,
  },
  teamTabs: { flexDirection: "row", gap: 10, marginBottom: 20 },
  teamTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  roster: {
    borderWidth: 1,
    borderColor: C.line,
    padding: 25,
    borderRadius: 18,
    backgroundColor: "#fff",
  },
  panelHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 17,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: font.display,
    fontSize: 25,
    fontWeight: "500",
    letterSpacing: -0.5,
  },
  helper: { fontSize: 11, lineHeight: 20, color: C.muted, marginTop: 5 },
  slots: { flexDirection: "row", flexWrap: "wrap" },
  member: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E3E9D8",
    paddingVertical: 23,
    backgroundColor: "#F5F7EF",
    minHeight: 192,
  },
  emptySlot: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D8DFCE",
    borderRadius: 13,
    minHeight: 192,
    alignItems: "center",
    justifyContent: "center",
  },
  insights: { flexDirection: "row", gap: 18, marginTop: 25 },
  insight: { flex: 1, padding: 25, borderRadius: 16 },
  insightLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#7F9173",
    marginTop: 18,
  },
  bigNumber: {
    fontFamily: font.display,
    fontSize: 38,
    fontWeight: "500",
    marginTop: 10,
  },
  insightText: { fontSize: 11, lineHeight: 20, color: "#85917B", marginTop: 9 },
  analysisPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 25,
    backgroundColor: "#fff",
    marginTop: 25,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: C.soft,
    borderRadius: 8,
    padding: 4,
  },
  tab: { padding: 10, paddingHorizontal: 17, borderRadius: 6 },
  matrixRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#EBEEE5",
    minHeight: 44,
  },
  matrixLabel: { width: 135, paddingRight: 10 },
  matrixCell: { width: 104, alignItems: "center", paddingVertical: 7 },
  matrixHeading: { fontSize: 8, color: C.muted, letterSpacing: 0.6 },
  multiplier: {
    width: 49,
    paddingVertical: 5,
    borderRadius: 5,
    alignItems: "center",
  },
  lowerPanels: { flexDirection: "row", gap: 20, marginTop: 25 },
  strengthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
  },
  input: {
    padding: 15,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    backgroundColor: "#fff",
    fontFamily: font.body,
    color: C.ink,
  },
});

export function generateMetadata() {
  return {
    title: "My teams · Pokéfolio",
    description:
      "Build teams of six Pokémon and explore their combined type strengths, weaknesses, and stats.",
  };
}
