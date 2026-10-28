import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Pokemon } from "@/lib/api";
import { art, C, font, title } from "@/lib/theme";
import { Button, Icon, Sheet, T } from "@/components/ui";

export type Team = { id: string; name: string; members: Pokemon[] };
type Store = {
  favorites: number[];
  teams: Team[];
  ready: boolean;
  toggleFavorite: (id: number) => void;
  pickTeam: (pokemon: Pokemon) => void;
  createTeam: (name: string) => string;
  renameTeam: (id: string, name: string) => void;
  deleteTeam: (id: string) => void;
  removeMember: (teamId: string, id: number) => void;
  notify: (message: string) => void;
};
const Context = createContext<Store | null>(null);
export const useStore = () => useContext(Context)!;
const KEY = "pokefolio:collection:v1";
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<Pokemon | null>(null);
  const [name, setName] = useState("");
  const [pickerError, setPickerError] = useState("");
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const skipHydrationSave = useRef(true);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw || !active) return;
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.favorites))
          setFavorites(
            saved.favorites.filter((x: unknown) => typeof x === "number"),
          );
        if (Array.isArray(saved.teams))
          setTeams(
            saved.teams
              .filter(
                (t: Team) =>
                  typeof t.id === "string" &&
                  typeof t.name === "string" &&
                  Array.isArray(t.members),
              )
              .map((t: Team) => ({ ...t, members: t.members.slice(0, 6) })),
          );
      })
      .catch(() => {
        if (active) setToast("Your saved collection could not be loaded.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    // Loading a collection must not overwrite storage if its initial read failed.
    if (skipHydrationSave.current) {
      skipHydrationSave.current = false;
      return;
    }
    saveQueue.current = saveQueue.current
      .then(() =>
        AsyncStorage.setItem(KEY, JSON.stringify({ favorites, teams })),
      )
      .catch(() =>
        setToast(
          "Could not save to this device. Please check available storage.",
        ),
      );
  }, [favorites, teams, ready]);
  function notify(message: string) {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3600);
  }
  const createTeam = useCallback((teamName: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    setTeams((current) => [
      ...current,
      {
        id,
        name: teamName.trim().slice(0, 40) || "My adventure team",
        members: [],
      },
    ]);
    return id;
  }, []);
  function addToTeam(team: Team) {
    if (!selected) return;
    if (team.members.some((p) => p.id === selected.id)) {
      setPickerError(`${title(selected.name)} is already on this team.`);
      return;
    }
    if (team.members.length >= 6) {
      setPickerError("This team is full. Make room for a new friend first.");
      return;
    }
    setTeams((current) =>
      current.map((t) =>
        t.id === team.id ? { ...t, members: [...t.members, selected] } : t,
      ),
    );
    notify(`${title(selected.name)} joined ${team.name}!`);
    setSelected(null);
  }
  return (
    <Context.Provider
      value={{
        favorites,
        teams,
        ready,
        toggleFavorite: (id) => {
          if (ready)
            setFavorites((current) =>
              current.includes(id)
                ? current.filter((x) => x !== id)
                : [...current, id],
            );
        },
        pickTeam: (pokemon) => {
          if (ready) {
            setSelected(pokemon);
            setName("");
            setPickerError("");
          }
        },
        createTeam,
        renameTeam: (id, teamName) =>
          setTeams((current) =>
            current.map((t) =>
              t.id === id
                ? { ...t, name: teamName.trim().slice(0, 40) || t.name }
                : t,
            ),
          ),
        deleteTeam: (id) =>
          setTeams((current) => current.filter((t) => t.id !== id)),
        removeMember: (id, pokemonId) =>
          setTeams((current) =>
            current.map((t) =>
              t.id === id
                ? { ...t, members: t.members.filter((p) => p.id !== pokemonId) }
                : t,
            ),
          ),
        notify,
      }}
    >
      {children}
      <Sheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        heading="A new team member"
      >
        {selected && (
          <View style={styles.selected}>
            <Image
              source={{ uri: art(selected.id) }}
              style={{ width: 72, height: 72 }}
              contentFit="contain"
            />
            <View>
              <T style={{ fontSize: 20, fontWeight: "700" }}>
                {title(selected.name)}
              </T>
              <T style={{ color: C.muted, marginTop: 4 }}>
                Choose their next adventure.
              </T>
            </View>
          </View>
        )}
        {!!pickerError && (
          <T
            accessibilityRole="alert"
            style={{
              color: C.red,
              backgroundColor: "#F5E8E1",
              padding: 13,
              borderRadius: 9,
              fontSize: 12,
              lineHeight: 20,
              marginBottom: 15,
            }}
          >
            {pickerError}
          </T>
        )}
        {teams.map((team) => (
          <Pressable
            key={team.id}
            onPress={() => addToTeam(team)}
            accessibilityRole="button"
            style={styles.team}
          >
            <View>
              <T style={{ fontWeight: "700" }}>{team.name}</T>
              <T style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                {team.members.length} / 6 Pokémon
              </T>
            </View>
            <Icon
              name={
                team.members.length >= 6
                  ? "lock-closed-outline"
                  : "add-circle-outline"
              }
            />
          </Pressable>
        ))}
        <T style={{ marginTop: 22, marginBottom: 10, fontWeight: "700" }}>
          Start a fresh adventure
        </T>
        <TextInput
          accessibilityLabel="New team name"
          placeholder="Give your team a name"
          placeholderTextColor={C.muted}
          value={name}
          onChangeText={setName}
          maxLength={40}
          style={styles.input}
        />
        <Button
          style={{ marginTop: 12 }}
          onPress={() => {
            if (!selected) return;
            const id = Date.now().toString(36);
            const teamName = name.trim() || "My adventure team";
            setTeams((current) => [
              ...current,
              { id, name: teamName, members: [selected] },
            ]);
            setSelected(null);
            notify(`${teamName} is ready for adventure!`);
          }}
          icon="add"
        >
          Create team & add Pokémon
        </Button>
      </Sheet>
      {!!toast && (
        <Pressable
          accessibilityRole="alert"
          onPress={() => setToast("")}
          style={styles.toast}
        >
          <Icon name="checkmark-circle" color={C.lime} />
          <T style={{ color: "#fff", flex: 1 }}>{toast}</T>
          <Icon name="close" color="#fff" size={16} />
        </Pressable>
      )}
    </Context.Provider>
  );
}
const styles = StyleSheet.create({
  selected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.soft,
    borderRadius: 15,
    padding: 12,
    marginBottom: 18,
  },
  team: {
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  input: {
    fontFamily: font.body,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 14,
    color: C.ink,
    backgroundColor: "#fff",
  },
  toast: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: C.deep,
    padding: 18,
    borderRadius: 14,
    maxWidth: 440,
    width: "90%",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    boxShadow: "0 6px 30px #0002",
    zIndex: 100,
  },
});
