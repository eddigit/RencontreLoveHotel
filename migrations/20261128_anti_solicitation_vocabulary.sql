-- APPLIQUÉ EN PRODUCTION LE 28 NOVEMBRE 2026, sur accord de Gilles.
-- Vocabulaire complémentaire pour la détection des sollicitations tarifées :
-- 20 règles actives, et « payant » ramené du poids 6 au poids 3.
-- Les formes plurielles et féminines sont reconnues par le code
-- (tarif -> tarifs, payant -> payante).
--
-- Rappel du barème : somme des poids >= 3 dossier ouvert, message livré ;
-- >= 6 message retenu pour examen humain ; >= 8 messagerie suspendue 24 h.
-- Les mots courants restent donc à poids 1 ou 2 et n'alertent qu'en combinaison.

INSERT INTO moderation_keywords (keyword, severity, action, active, category, weight, phrase, policy_version)
VALUES
  ('escort', 'critical', 'escalate', TRUE, 'sexual_service', 6, FALSE, 'anti-solicitation-2026-07-15'),
  ('escorte', 'critical', 'escalate', TRUE, 'sexual_service', 6, FALSE, 'anti-solicitation-2026-07-15'),
  ('contre argent', 'high', 'escalate', TRUE, 'exchange', 5, TRUE, 'anti-solicitation-2026-07-15'),
  ('contre paiement', 'high', 'escalate', TRUE, 'exchange', 5, TRUE, 'anti-solicitation-2026-07-15'),
  ('rencontre tarifée', 'high', 'escalate', TRUE, 'exchange', 5, TRUE, 'anti-solicitation-2026-07-15'),
  ('rémunéré', 'medium', 'flag', TRUE, 'exchange', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('vénale', 'medium', 'flag', TRUE, 'exchange', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('défraiement', 'medium', 'flag', TRUE, 'exchange', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('dédommagement', 'medium', 'flag', TRUE, 'exchange', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('participation financière', 'medium', 'flag', TRUE, 'exchange', 3, TRUE, 'anti-solicitation-2026-07-15'),
  ('roses', 'medium', 'flag', TRUE, 'price', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('généreux', 'medium', 'flag', TRUE, 'benefit', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('euros', 'low', 'flag', TRUE, 'price', 1, FALSE, 'anti-solicitation-2026-07-15'),
  ('virement', 'medium', 'flag', TRUE, 'payment', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('revolut', 'medium', 'flag', TRUE, 'payment', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('lydia', 'medium', 'flag', TRUE, 'payment', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('espèces', 'medium', 'flag', TRUE, 'payment', 2, FALSE, 'anti-solicitation-2026-07-15'),
  ('onlyfans', 'medium', 'flag', TRUE, 'paid_content', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('mym', 'medium', 'flag', TRUE, 'paid_content', 3, FALSE, 'anti-solicitation-2026-07-15'),
  ('massage', 'low', 'flag', TRUE, 'sexual_service', 1, FALSE, 'anti-solicitation-2026-07-15')
ON CONFLICT (keyword) DO NOTHING;

-- « payant » retenait à lui seul un message (« le parking est payant »).
UPDATE moderation_keywords SET weight = 3, severity = 'medium' WHERE keyword = 'payant' AND weight = 6;
