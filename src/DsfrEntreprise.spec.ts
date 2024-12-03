import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import DsfrEntreprise from "./DsfrEntreprise.vue";

describe("DsfrEntreprise", () => {
    it("émet l'événement 'enterpriseSelected' avec l'entreprise correcte", async () => {
        const wrapper = mount(DsfrEntreprise, {
            data() {
                return {
                    // Initialement, pas de suggestions
                    suggestions: [],
                };
            },
            attachTo: document.body, // Pour s'assurer qu'il est monté
        });

        const input = wrapper.find("input");

        // Simuler la saisie de texte dans le champ de saisie
        await input.setValue("dgfip");

        // Mettre à jour les suggestions après la saisie
        await wrapper.setData({
            suggestions: [
                {
                    nom_entreprise: "DIRECTION GENERALE DES FINANCES PUBLIQUES",
                    adresse: "139 Rue de Bercy 75012 Paris",
                    siren: "130004955",
                    code_postal: "75012",
                    ville: "PARIS",
                },
            ],
        });

        // Attendre que Vue ait terminé de mettre à jour le DOM
        await wrapper.vm.$nextTick();

        // Attendre un peu plus longtemps pour s'assurer que l'élément est visible
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Vérifier que le menu des suggestions est visible
        const suggestionMenu = wrapper.find(".fr-menu__list");
        const style = getComputedStyle(suggestionMenu.element);

        // Vérifier que l'élément n'est pas masqué avec display: none
        expect(style.display).not.toBe("none");

        // Vérifier qu'il y a au moins une suggestion dans le menu
        const listItems = suggestionMenu.findAll("li");
        expect(listItems.length).toBeGreaterThan(0); // Vérifie qu'il y a au moins une suggestion

        // Vérifier que le texte dans le premier élément de la liste correspond à l'entreprise simulée
        const firstSuggestion = listItems.at(0);

        // Vérifier si firstSuggestion existe avant de l'utiliser
        expect(firstSuggestion).toBeDefined();

        if (firstSuggestion) {
            expect(firstSuggestion.text()).toContain("DIRECTION GENERALE DES FINANCES PUBLIQUES - 139 Rue de Bercy 75012 Paris");

            // Simuler la sélection de l'entreprise
            await firstSuggestion.trigger("click");

            // Vérifier que l'événement 'enterpriseSelected' a bien été émis
            const emittedEvents = wrapper.emitted("enterpriseSelected");

            // Assurer que l'événement a bien été émis
            expect(emittedEvents).toBeTruthy(); // Vérifie que 'emittedEvents' existe
            expect(emittedEvents?.length).toBeGreaterThan(0); // Vérifie qu'il y a des événements émis

            // Vérifier le contenu de l'événement
            if (emittedEvents && emittedEvents.length > 0) {
                expect(emittedEvents[0][0]).toEqual({
                    nom_entreprise: "DIRECTION GENERALE DES FINANCES PUBLIQUES",
                    adresse: "139 Rue de Bercy 75012 Paris",
                    siren: "130004955",
                    code_postal: "75012",
                    ville: "PARIS",
                });
            } else {
                throw new Error("L'événement 'enterpriseSelected' n'a pas été émis.");
            }
        }
    });
});
