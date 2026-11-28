-- PROPOSITION, À VALIDER PAR GILLES AVANT TOUTE EXÉCUTION.
-- Vocabulaire complémentaire pour la détection des sollicitations tarifées.
-- Toutes les règles sont insérées INACTIVES : rien ne change tant qu'elles ne
-- sont pas activées une à une. Les formes plurielles et féminines sont
-- reconnues par le code (tarif -> tarifs, payant -> payante).
--
-- Rappel du barème : somme des poids >= 3 dossier ouvert, message livré ;
-- >= 6 message retenu pour examen humain ; >= 8 messagerie suspendue 24 h.
-- Les mots courants restent donc à poids 1 ou 2 et n'alertent qu'en combinaison.

INSERT INTO moderation_keywords (keyword, severity, action, active, category, weight, phrase, policy_version)
VALUES
  ('escort', 'critical', 'escalate', FALSE, 'sexual_service', 6, FALSE, 'anti-solicitation-2026-07-15'),
  ('escorte', 'critical', 'escalate', FALSE, 'sexual_service', 6, FALSE, 'anti-solicitation-2026-07-15'),
  ('contre argent', 'high', 'escalate', FALSE, 'exchange', 5, TRUE, 'anti-solicitation-2026-07-15'),
  ('contre paiement', 'high', 'escalate', FALSE, 'exchange', 5, TRUE, 'anti-solicitation-2026-07-15'),
  ('rencontre tarifée', 'high', 'escalate', FALSE, 'exchange', 5, TRUE, 'anti-solicitation-2026-07-15'),
  ('rémunéré', 'medium', 'flag', FALSE, 'exchange', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('vénale', 'medium', 'flag', FALSE, 'exchange', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('défraiement', 'medium', 'flag', FALSE, 'exchange', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('dédommagement', 'medium', 'flag', FALSE, 'exchange', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('participation financière', 'medium', 'flag', FALSE, 'exchange', 3, TRUE, 'anti-solicitation-2026-07-15'),
  ('roses', 'medium', 'flag', FALSE, 'price', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('généreux', 'medium', 'flag', FALSE, 'benefit', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('euros', 'low', 'flag', FALSE, 'price', 1, FALSE, 'anti-solicitation-2026-07-15'),
  ('virement', 'medium', 'flag', FALSE, 'payment', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('revolut', 'medium', 'flag', FALSE, 'payment', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('lydia', 'medium', 'flag', FALSE, 'payment', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('espèces', 'medium', 'flag', FALSE, 'payment', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('onlyfans', 'medium', 'flag', FALSE, 'paid_content', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('mym', 'medium', 'flag', FALSE, 'paid_content', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('massage', 'low', 'flag', FALSE, 'sexual_service', 1, FALSE, 'anti-solicitation-2026-07-15')
ON CONFLICT (keyword) DO NOTHING;

-- Point d'attention sur une règle existante : « payant » (poids 6) retient à
-- lui seul un message, y compris « le parking est payant ». Poids conseillé : 3.
-- UPDATE moderation_keywords SET weight = 3, severity = 'medium' WHERE keyword = 'payant';
