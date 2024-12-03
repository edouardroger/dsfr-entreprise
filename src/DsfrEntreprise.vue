<template>
    <div class="fr-input-group" ref="inputGroupRef">
        <label :for="inputId" class="fr-label">{{ label }}
            <span class="fr-hint-text" v-show="hint">{{ hint }}</span>
        </label>
        <input type="text" class="fr-input" role="combobox" :aria-expanded="suggestions.length > 0" :id="inputId"
            v-model="query" @input="debounceGetEnterpriseSuggestions" @keydown="handleKeyDown" aria-autocomplete="list"
            aria-controls="suggestions" :aria-activedescendant="activeDescendant" autocomplete="off"
            :aria-describedby="errorMessageId" :required="required" />
        <p v-if="errorMessage" class="fr-error-text" :id="errorMessageId" role="alert">{{ errorMessage }}</p>
        <div class="fr-menu" v-show="suggestions.length > 0">
            <ul class="fr-menu__list" role="listbox" :id="suggestionsId" aria-label="Entreprises suggérées">
                <li v-for="(suggestion, index) in suggestions" :key="index" :id="'suggestion-' + index" role="option"
                    class="fr-nav__link" :aria-selected="index === activeIndex" @click="selectEnterprise(index)">
                    {{ suggestion.nom_entreprise }} - {{ suggestion.adresse }}
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType, onMounted, onBeforeUnmount, watch } from "vue";

interface EnterpriseSuggestion {
    nom_entreprise: string;
    adresse: string;
    siren: string;
    code_postal: string;
    ville: string;
}

interface SelectedEnterprise {
    nom_entreprise: string;
    adresse: string;
    siren: string;
    code_postal: string;
    ville: string;
}

export default defineComponent({
    name: "DsfrEntreprise",
    props: {
        label: {
            type: String as PropType<string>,
            default: "Nom de l'entreprise",
        },
        inputId: {
            type: String as PropType<string>,
            default: () => `input-${Math.random().toString(36).substr(2, 9)}`,
        },
        hint: {
            type: String as PropType<string>,
        },
        errorMessage: {
            type: String as PropType<string>,
            default: "",
        },
        required: {
            type: Boolean,
            default: false,
        },
        per_page: {
            type: Number as PropType<number>,
            default: 5,
        },
        type: {
            type: String as PropType<string>,
            validator: (value: string) => ["all", "pp", "pm"].includes(value),
            default: "all",
        },
        departement: {
            type: String as PropType<string>,
        },
        codePostal: {
            type: String as PropType<string>,
        },
        region: {
            type: String as PropType<string>,
        },
        est_service_public: {
            type: Boolean as PropType<boolean>,
            default: false,
        },
        est_collectivite_territoriale: {
            type: Boolean as PropType<boolean>,
            default: false,
        },
    },
    emits: ["enterpriseSelected"],
    setup(props, { emit }) {
        const query = ref<string>("");
        const suggestions = ref<EnterpriseSuggestion[]>([]);
        const activeIndex = ref<number>(-1);
        const debounceTimeout = ref<number | null>(null);
        const inputGroupRef = ref<HTMLElement | null>(null);
        const errorMessage = ref<string>(props.errorMessage);

        const activeDescendant = computed<string>(() => {
            return activeIndex.value >= 0 ? `suggestion-${activeIndex.value}` : "";
        });

        watch(() => props.errorMessage, (newError) => {
            errorMessage.value = newError;
        });

        const errorMessageId = computed(() => `error-message-${props.inputId}`);
        const suggestionsId = computed(() => `suggestions-${props.inputId}`);

        const buildQueryParams = () => {
            const params: Record<string, string> = {
                q: query.value,
                per_page: props.per_page.toString(),
                type: props.type,
            };

            if (props.departement) params.departement = props.departement;
            if (props.codePostal) params.code_postal = props.codePostal;
            if (props.region) params.region = props.region;
            if (props.est_service_public) params.est_service_public = "true";
            if (props.est_collectivite_territoriale)
                params.est_collectivite_territoriale = "true";

            return new URLSearchParams(params).toString();
        };

        const getEnterpriseSuggestions = async () => {
            if (query.value.length < 3) {
                hideSuggestions();
                return;
            }

            try {
                const baseUrl = "https://recherche-entreprises.api.gouv.fr/search";
                const url = `${baseUrl}?${buildQueryParams()}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error("Erreur de récupération des entreprises.");
                }

                const data = await response.json();
                if (data.results && Array.isArray(data.results)) {
                    suggestions.value = data.results.map((result: any) => ({
                        nom_entreprise: result.nom_raison_sociale,
                        adresse: result.siege?.geo_adresse || result.siege?.adresse,
                        siren: result.siren,
                        code_postal: result.siege?.code_postal || "",
                        ville: result.siege?.libelle_commune || "",
                    }));
                    activeIndex.value = -1;
                    errorMessage.value = "";
                } else {
                    throw new Error("Les résultats sont vides ou mal formatés.");
                }
            } catch (error) {
                errorMessage.value =
                    "Erreur lors de l'obtention des entreprises. Veuillez réessayer.";
                console.error("Erreur lors de l'obtention des entreprises :", error);
            }
        };

        const debounceGetEnterpriseSuggestions = () => {
            if (debounceTimeout.value) {
                clearTimeout(debounceTimeout.value);
            }

            debounceTimeout.value = window.setTimeout(() => {
                getEnterpriseSuggestions();
            }, 300);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            // Si aucune suggestion n'est affichée
            if (suggestions.value.length === 0) {
                if (event.key === "Escape") {
                    // Si aucune suggestion, on vide le champ de saisie
                    query.value = "";
                }
            } else {
                // Si des suggestions sont affichées
                if (event.key === "Escape") {
                    // On cache les suggestions
                    hideSuggestions();
                } else if (event.key === "ArrowDown") {
                    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length;
                } else if (event.key === "ArrowUp") {
                    activeIndex.value = (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
                } else if (event.key === "Enter" && activeIndex.value >= 0) {
                    selectEnterprise(activeIndex.value);
                } else if (event.key === "Tab") {
                    hideSuggestions();
                }
            }
        };

        const selectEnterprise = (index: number) => {
            const selected = suggestions.value[index];
            const selectedEnterprise: SelectedEnterprise = {
                nom_entreprise: selected.nom_entreprise,
                adresse: selected.adresse,
                siren: selected.siren,
                code_postal: selected.code_postal,
                ville: selected.ville,
            };
            query.value = `${selected.nom_entreprise} - ${selected.adresse}`;
            suggestions.value = [];

            emit("enterpriseSelected", selectedEnterprise);
        };

        const hideSuggestions = () => {
            suggestions.value = [];
            activeIndex.value = -1;
        };

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (inputGroupRef.value && !inputGroupRef.value.contains(target)) {
                hideSuggestions();
            }
        };

        onMounted(() => {
            document.addEventListener("click", handleClickOutside);
        });

        onBeforeUnmount(() => {
            document.removeEventListener("click", handleClickOutside);
        });

        return {
            query,
            suggestions,
            activeIndex,
            activeDescendant,
            debounceGetEnterpriseSuggestions,
            handleKeyDown,
            selectEnterprise,
            hideSuggestions,
            inputGroupRef,
            errorMessage,
            errorMessageId,
            suggestionsId,
        };
    },
});
</script>

<style scoped>
.fr-menu__list li[aria-selected="true"],
.fr-menu__list li:hover {
    background-color: var(--background-open-blue-france);
    outline: 2px solid var(--border-action-high-blue-france);
}

@media all {
    .fr-menu {
        filter: drop-shadow(var(--overlap-shadow));
    }

    .fr-menu__list {
        background-color: #fff;
        box-shadow: 0 0 0 1px rgba(0, 0, 18, .16);
    }

    .fr-menu .fr-nav__link {
        box-shadow: 0 calc(-1rem - 1px) 0 -1rem #ddd
    }
}
</style>