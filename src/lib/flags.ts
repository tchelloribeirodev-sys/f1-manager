// Catálogo de bandeiras "hardcoded" — SUBSTITUÍDO por src/lib/bandeiras.ts.
//
// Agora o catálogo (código + nome + imagem) fica gravado no banco, tabela
// f1.tb_bandeira (ver supabase/migrations/0008_bandeiras.sql), com as
// imagens no Supabase Storage. Isso permite cadastrar uma bandeira nova
// pela tela "Bandeiras" do próprio app, sem precisar editar este arquivo
// nem fazer novo build/deploy.
//
// Este arquivo não é mais importado em lugar nenhum — mantido só como nota
// histórica; pode ser apagado com segurança.
export {};
