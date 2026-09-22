# Design System — Oficina ERP

Catálogo do que existe hoje em `frontend/src`. As regras que originam este
documento estão em [`ARCHITECTURE.md` §7](./ARCHITECTURE.md#7-frontend); aqui
está o inventário.

O sistema é usado por uma atendente, no balcão e no celular, entre
atendimentos. A tela é o produto: ela tem que parecer um produto, não um
formulário de debug.

## Como usar este documento

- **Antes de escrever JSX, leia `frontend/src/components`.** Se o componente
  existe, use. Não recrie `Button`, `Input`, `Card`, `Badge` ou `EmptyState`
  com classe solta ao lado de um pronto.
- **Falta um componente que deveria existir?** Crie em `src/components` e
  use — não resolva inline na tela.
- **Componente novo entra neste catálogo no mesmo PR que o cria.** O aceite em
  [`BAC-64`](/BAC/issues/BAC-64) compara `ls src/components/*.tsx` com os
  títulos `###` deste arquivo; diferença reprova.
- **Mudou um token ou um componente?** Confira quem mais usa antes
  (`grep -rn NomeDoComponente frontend/src`). Alteração em componente
  compartilhado atinge todas as telas.

Este catálogo descreve **o que existe no código**, não o que seria bom existir.
Componente idealizado que ainda não foi escrito não entra aqui.

---

## Tokens

Tudo abaixo vive em `frontend/src/app/globals.css`. **Cor, sombra e raio não se
definem em nenhum outro arquivo** — tela que precisa de cor nova adiciona um
token lá e o documenta aqui.

O CI reprova cor literal fora de `globals.css`
(`.github/workflows/ci.yml`, job `Frontend`):

```bash
grep -rnE "text-gray-[0-9]|bg-(black|white)|#[0-9a-fA-F]{6}" src/app src/components \
  | grep -v globals.css     # -> vazio
```

#### Como os tokens são declarados

Os valores vivem como custom properties cruas em `:root` (claro) e `.dark`
(escuro); o bloco `@theme inline` só dá nome Tailwind a elas. O `inline` é
obrigatório: sem ele o utilitário congelaria o valor do claro e a troca de tema
pararia de funcionar.

```css
:root        { --accent: oklch(0.5 0.13 245); }
.dark        { --accent: oklch(0.68 0.13 245); }
@theme inline { --color-accent: var(--accent); }   /* habilita `bg-accent` */
```

Consequência prática: **`bg-accent`, `text-fg`, `border-line` funcionam; o
valor por trás deles muda sozinho no tema escuro.** Nunca escreva
`bg-[oklch(...)]` nem `bg-[var(--accent)]` — se o utilitário não existe, o
token está faltando no `@theme inline`.

#### Cor

| Utilitário | Token | Quando usar |
|---|---|---|
| `bg-canvas` | `--canvas` | Fundo da página. Uma vez por tela, no `<main>`. |
| `bg-surface` | `--surface` | Fundo de card, painel, modal, input. |
| `bg-surface-sunken` | `--surface-sunken` | Poço: cabeçalho de tabela, coluna de código, hover de item de menu. |
| `border-line` | `--line` | Borda divisória. Padrão de `Card`. |
| `border-line-strong` | `--line-strong` | Borda de campo e de contorno (borda tracejada do `EmptyState`). |
| `text-fg` | `--fg` | Texto principal: título, valor, conteúdo. |
| `text-muted` | `--muted` | Texto secundário: descrição, label de campo, texto de apoio. |
| `text-subtle` | `--subtle` | Texto terciário: placeholder, ícone inativo, dica. |
| `bg-accent` · `text-on-accent` | `--accent` · `--on-accent` | Ação primária. `bg-accent` **sempre** acompanha `text-on-accent` — é o que garante contraste nos dois temas. |
| `bg-accent-hover` | `--accent-hover` | Estado `hover` da ação primária. |
| `bg-accent-soft` · `text-accent` | `--accent-soft` | Realce suave: ícone de marca, badge de destaque, item de menu ativo. |
| `bg-danger` · `bg-danger-soft` · `text-danger` · `border-danger` | `--danger` | Erro e ação destrutiva. `bg-danger-soft` é o fundo do `ErrorState`. |
| `bg-success-soft` · `text-success` | `--success` | Confirmação: badge de OS finalizada, feedback de sucesso. |
| `bg-warning-soft` · `text-warning` | `--warning` | Atenção: estoque no mínimo, orçamento expirando. |
| `--ring` | `--ring` | Anel de foco. Não se usa direto: `:focus-visible` já está definido em `globals.css`. |

#### Tipografia

| Token | Valor | Quando usar |
|---|---|---|
| `font-sans` | `system-ui, -apple-system, 'Segoe UI', Roboto, …` | Padrão do `body`. Pilha de sistema: carrega sem rede, funciona no balcão com 3G ruim. |
| `font-mono` | `ui-monospace, 'SF Mono', Menlo, …` | Placa de veículo, código de peça, SKU, CPF/CNPJ — o que se lê dígito a dígito. |

A escala é a do Tailwind (`text-xs`…`text-4xl`). **Peso distingue mais que
tamanho:** título em `font-semibold`, corpo em peso normal, rótulo em
`font-medium`. Escala usada hoje: `text-xs` (dica, erro de campo), `text-sm`
(corpo, label, botão), `text-base` (título de card), `text-xl` (título de
tela), `text-2xl`/`text-3xl` (marca e métrica do dashboard).

#### Raio

| Utilitário | Token | Valor | Quando usar |
|---|---|---|---|
| `rounded-sm` | `--radius-sm` | `0.25rem` | Selo pequeno, chip. |
| `rounded-md` | `--radius-md` | `0.5rem` | Botão, input, select, textarea. |
| `rounded-lg` | `--radius-lg` | `0.75rem` | Card, painel, modal, ícone de marca. |
| `rounded-pill` | `--radius-pill` | `9999px` | Badge, filtro, avatar, contador. |

#### Profundidade

| Utilitário | Token | Quando usar |
|---|---|---|
| `shadow-card` | `--shadow-card` | O que repousa na página: `Card` com `elevation="card"` (padrão). |
| `shadow-float` | `--shadow-float` | O que flutua sobre o conteúdo: modal, dropdown, card de login. |
| — | — | Sem sombra: `elevation="none"`, para card dentro de card. |

Se toda superfície é borda + fundo chapado, nada tem peso. A sombra é o que
separa a camada que flutua do fundo.

#### Espaçamento

Escala de 4px do Tailwind (`p-1`, `p-2`, `p-3`, `p-4`, `gap-1.5`, `gap-3`…).
**Nada de valor avulso** — `p-[13px]` e `mt-[7px]` reprovam na revisão. Os
passos em uso: `1.5` (label↔campo), `3` (entre campos), `4` (padding de card e
de botão), `6`/`12` (respiro do estado vazio).

#### Utilitário próprio

| Classe | Efeito | Quando usar |
|---|---|---|
| `touch-target` | `min-height`/`min-width` de `2.75rem` (44px) | Alvo de toque pequeno: botão de ícone, ação de linha de tabela. Os componentes de formulário já aplicam por dentro. |

#### Tema escuro

O tema é a classe `.dark` no `<html>` — a alternância em si ainda não está
implementada no frontend. Todo token tem variante escura declarada; por isso
**cor de tela sempre vem de token** e o tema escuro funciona sem retrabalho.

---

## Componentes

### Badge

Rótulo curto de estado. Status de OS, categoria, contador.

```tsx
import { Badge } from '@/components/Badge';

<Badge tone="success">Finalizada</Badge>
<Badge tone="warning">Aguardando peça</Badge>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `tone` | `'neutral' \| 'accent' \| 'success' \| 'warning' \| 'danger'` | `'neutral'` | Cor semântica. `neutral` é o cinza de "sem estado". |
| `children` | `ReactNode` | — | O rótulo. Verbo ou estado, curto: cabe em uma linha no celular. |
| `className` | `string` | — | Classe extra. |

Uma palavra, não uma frase. "Finalizada" — não "Esta ordem foi finalizada".

### Button

Ação da tela.

```tsx
import { Button } from '@/components/Button';
import { Plus } from 'lucide-react';

<Button onClick={abrirNovoCliente} icon={<Plus className="size-4" aria-hidden="true" />}>
  Novo cliente
</Button>

<Button variant="secondary" onClick={voltar}>Voltar</Button>
<Button variant="danger" loading={excluindo} onClick={excluir}>Excluir</Button>
<Button variant="ghost" size="sm">Cancelar</Button>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | `primary` é a **única** ação principal da tela. `secondary` é alternativa com contorno. `ghost` é ação discreta (cancelar, fechar). `danger` é destrutiva. |
| `size` | `'sm' \| 'md'` | `'md'` | `sm` reduz o padding lateral, **não** a área de toque. |
| `loading` | `boolean` | `false` | Mostra o giro, desabilita o clique e marca `aria-busy`. Use durante o `POST`/`PATCH` — nunca só um estado local sem feedback. |
| `icon` | `ReactNode` | — | Ícone à esquerda do texto. Sempre `aria-hidden` (o texto já nomeia o botão) ou com `aria-label` próprio se o botão for só ícone. |
| `fullWidth` | `boolean` | `false` | Ocupa a largura toda. Padrão em formulário de celular. |
| `type` | `'button' \| 'submit'` | `'button'` | É `button` por padrão de propósito: botão dentro de `<form>` que não deve submeter não precisa de `type` explícito. |

Ação destrutiva com `variant="danger"` **exige confirmação** antes de executar.

### Card

Superfície de conteúdo: agrupa o que pertence ao mesmo assunto.

```tsx
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@/components/Card';

<Card>
  <CardHeader>
    <CardTitle>Dados do cliente</CardTitle>
    <Button variant="ghost" size="sm">Editar</Button>
  </CardHeader>
  <CardBody>
    <p className="text-sm text-fg">Maria Souza</p>
  </CardBody>
  <CardFooter>
    <Button variant="secondary">Cancelar</Button>
    <Button type="submit">Salvar</Button>
  </CardFooter>
</Card>
```

| Prop (`Card`) | Tipo | Padrão | Descrição |
|---|---|---|---|
| `elevation` | `'card' \| 'float' \| 'none'` | `'card'` | `float` para modal/dropdown. `none` para card dentro de card. |

Os sub-componentes (`CardHeader`, `CardTitle`, `CardBody`, `CardFooter`) são
divisórias com o espaçamento do sistema — `CardBody` sozinho, dentro de um
`Card`, é o caso mais simples e suficiente na maioria das telas.

**StatCard** (no mesmo arquivo) é a métrica do dashboard: número grande, rótulo
pequeno, ícone à direita.

```tsx
import { StatCard } from '@/components/Card';
import { Wrench } from 'lucide-react';

<StatCard
  label="OS abertas"
  value={12}
  hint="3 aguardando peça"
  icon={<Wrench className="size-5" aria-hidden="true" />}
/>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `label` | `string` | — | O que o número significa. |
| `value` | `ReactNode` | — | O número. Ele é o herói do card. |
| `hint` | `string` | — | Contexto abaixo do número. |
| `icon` | `ReactNode` | — | Ícone à direita, decorativo (`aria-hidden`). |

Quatro números do mesmo tamanho do corpo do texto significam que o dashboard
não tem dashboard. **Nunca escreva número inventado** para preencher o card:
métrica sem dado real é pior que métrica ausente.

### EmptyState

Lista sem resultado. **Sempre diga o próximo passo** — "nenhum registro" sozinho
não é estado vazio.

```tsx
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';

<EmptyState
  title="Nenhum cliente cadastrado"
  description="Cadastre o primeiro cliente para abrir uma ordem de serviço."
  action={<Button>Novo cliente</Button>}
/>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `title` | `string` | — | O que está vazio, em uma linha. |
| `description` | `string` | — | O que fazer em seguida. |
| `icon` | `ReactNode` | `<Inbox />` | Ícone do contexto (ex.: `<Car />` para veículos). |
| `action` | `ReactNode` | — | A ação que resolve o vazio — normalmente o mesmo botão primário da tela. |

### ErrorState

Falha ao carregar ou ao salvar. Mostra a causa e oferece a saída.

```tsx
import { ErrorState } from '@/components/ErrorState';

<ErrorState
  message={erro.message}
  onRetry={() => refetch()}
/>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `message` | `string` | — | **O texto real do erro**, como veio da fonte (`error.message`, corpo da resposta). Nunca "falha na operação". |
| `title` | `string` | `'Não foi possível carregar'` | Título curto. |
| `onRetry` | `() => void` | — | Reexecuta a operação que falhou. Sem isto o erro vira beco sem saída. |

Erro do sistema externo chega **verbatim**: código HTTP e corpo inclusive.
Resumir esconde a causa de quem precisa agir.

### Field

Invólucro de um campo: label associada, dica e erro no lugar certo.
`Input`, `Textarea` e `Select` não trazem label — eles **sempre** vão dentro de
um `Field`.

```tsx
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';

<Field htmlFor="telefone" label="Telefone" hint="Com DDD" required>
  <Input id="telefone" name="telefone" value={telefone} onChange={...} />
</Field>

<Field htmlFor="email" label="E-mail" error={erros.email} required>
  <Input id="email" invalid={Boolean(erros.email)} value={email} onChange={...} />
</Field>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `htmlFor` | `string` | — | **Precisa casar com o `id` do campo.** É o que associa a label (acessibilidade, e o CI de revisão cobra). |
| `label` | `string` | — | Rótulo. Nunca use placeholder como rótulo — ele some quando a pessoa digita. |
| `hint` | `string` | — | Texto de apoio. Não substitui a label. |
| `error` | `string` | — | Erro **do campo**, exibido junto dele e não só no topo do formulário. |
| `required` | `boolean` | `false` | Marca o asterisco. Não substitui a validação do backend. |

### Input

Campo de texto. Sempre dentro de um `Field`.

```tsx
<Input id="nome" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
<Input id="email" type="email" autoComplete="email" invalid={Boolean(erro)} />
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `invalid` | `boolean` | `false` | Pinta a borda de erro (e marca `aria-invalid`). O texto do erro fica no `Field`. |
| demais | `InputHTMLAttributes` | — | `name`, `type`, `autoComplete`, `required`… Use `autoComplete` correto: acelera o cadastro no balcão. |

Altura mínima de 44px — o formulário é preenchido no celular.

### LoadingState

Espera de tela inteira. Para espera pontual, use `Spinner` direto.

```tsx
import { LoadingState } from '@/components/LoadingState';

<LoadingState message="Carregando ordens de serviço…" />
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `message` | `string` | `'Carregando…'` | Diga **o que** está carregando. |

### PageHeader

Cabeçalho padrão de tela: título, contexto e a ação primária.

```tsx
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';

<PageHeader
  title="Clientes"
  description="12 clientes ativos"
  action={<Button>Novo cliente</Button>}
/>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `title` | `string` | — | Título da tela. Um `<h1>` por tela. |
| `description` | `string` | — | Contexto: contagem, filtro ativo, o que a tela mostra. |
| `action` | `ReactNode` | — | **A ação primária. Uma só**, destacada das secundárias. |

### Select

Escolha única. Sempre dentro de um `Field`.

```tsx
<Field htmlFor="status" label="Status">
  <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
    <option value="">Todos</option>
    <option value="aberta">Aberta</option>
    <option value="finalizada">Finalizada</option>
  </Select>
</Field>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `invalid` | `boolean` | `false` | Igual ao `Input`. |

A primeira opção de um filtro é a que limpa o filtro ("Todos"), com `value=""`.

### Spinner

Giro de carregamento. Use dentro do estado de carregando da tela, ou em
operação pontual (botão, linha de tabela).

```tsx
import { Spinner } from '@/components/Spinner';

<Spinner />
<Spinner className="size-6" label="Enviando orçamento" />
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `className` | `string` | — | Tamanho (`size-4`, `size-6`). |
| `label` | `string` | `'Carregando'` | Nome acessível (`aria-label`). Descreva a operação, não "loading". |

### Textarea

Campo de texto longo. Sempre dentro de um `Field`. Para as observações do
cliente, do veículo e da OS.

```tsx
<Field htmlFor="observacoes" label="Observações">
  <Textarea id="observacoes" rows={4} value={obs} onChange={...} />
</Field>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `invalid` | `boolean` | `false` | Igual ao `Input`. |
| `rows` | `number` | `4` | Altura inicial. |

---

## Padrões de tela

Três telas cobrem quase todo o sistema: **listagem**, **formulário** e
**detalhe**. Toda tela tem um estado a mais que os outros: além do conteúdo,
**vazio, carregando e erro** são parte dela, não extra.

#### Listagem

Cabeçalho com a ação primária, filtro, e o conteúdo. A tabela vira lista de
cards no celular — tabela larga com scroll horizontal não é usável com o
polegar.

```tsx
export default function ClientesPage() {
  const { data, isLoading, error, refetch } = useClientes();

  return (
    <main className="flex flex-col gap-4 bg-canvas px-4 py-6">
      <PageHeader
        title="Clientes"
        description={data ? `${data.length} clientes ativos` : undefined}
        action={<Button icon={<Plus className="size-4" aria-hidden="true" />}>Novo cliente</Button>}
      />

      {isLoading && <LoadingState message="Carregando clientes…" />}

      {error && <ErrorState message={error.message} onRetry={refetch} />}

      {data?.length === 0 && (
        <EmptyState
          title="Nenhum cliente cadastrado"
          description="Cadastre o primeiro cliente para abrir uma ordem de serviço."
          action={<Button>Novo cliente</Button>}
        />
      )}

      {data && data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.map((cliente) => (
            <li key={cliente.id}>
              <Card className="p-4">
                <p className="font-medium text-fg">{cliente.nome}</p>
                <p className="text-sm text-muted">{cliente.telefone}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

A ordem dos três estados não é livre: **carregando → erro → vazio → conteúdo**.
Checar vazio antes de terminar o carregamento pisca "nenhum cliente" numa lista
que ainda vai chegar.

#### Formulário

Campos agrupados em seções com título, erro junto do campo, ação primária
fixa no rodapé. Formulário longo em uma única coluna de campos soltos é
ilegível no celular.

```tsx
<form onSubmit={handleSubmit} className="flex flex-col gap-4">
  <Card>
    <CardHeader>
      <CardTitle>Dados do cliente</CardTitle>
    </CardHeader>
    <CardBody className="flex flex-col gap-3">
      <Field htmlFor="nome" label="Nome" error={erros.nome} required>
        <Input id="nome" invalid={Boolean(erros.nome)} value={nome} onChange={...} />
      </Field>
      <Field htmlFor="telefone" label="Telefone" hint="Com DDD" required>
        <Input id="telefone" invalid={Boolean(erros.telefone)} value={telefone} onChange={...} />
      </Field>
      <Field htmlFor="observacoes" label="Observações">
        <Textarea id="observacoes" value={obs} onChange={...} />
      </Field>
    </CardBody>
  </Card>

  {erroGeral && <ErrorState title="Não foi possível salvar" message={erroGeral} />}

  <CardFooter className="gap-2 px-0">
    <Button variant="secondary" onClick={cancelar}>Cancelar</Button>
    <Button type="submit" loading={salvando}>Salvar</Button>
  </CardFooter>
</form>
```

Regras do formulário:

- **Erro junto do campo**, via `Field error`. O `ErrorState` fica para a falha
  da operação inteira (rede, 500, 409 do backend).
- **`loading` no botão de submit** durante a gravação. Botão que não dá sinal
  nenhum faz a pessoa clicar duas vezes e criar registro duplicado.
- **Feedback depois de salvar** — toast ou inline. Nunca silêncio.
- **Confirmação antes de ação destrutiva** (`variant="danger"`).

#### Detalhe

Título com a identidade do registro, ação primária no cabeçalho, dados em
cards por assunto. É a tela da ficha do cliente e da OS.

```tsx
<main className="flex flex-col gap-4 bg-canvas px-4 py-6">
  <PageHeader
    title={cliente.nome}
    description={cliente.documento}
    action={<Button>Nova OS</Button>}
  />

  {isLoading && <LoadingState message="Carregando a ficha do cliente…" />}
  {error && <ErrorState message={error.message} onRetry={refetch} />}

  {cliente && (
    <>
      <Card>
        <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Field htmlFor="tel" label="Telefone">
            <Input id="tel" readOnly value={cliente.telefone} />
          </Field>
        </CardBody>
      </Card>

      {/* Abaixo, a lista relacionada: veículos, histórico de OS.
          Se ela pode vir vazia, tem estado vazio próprio. */}
      <EmptyState
        title="Nenhum veículo cadastrado"
        description="Adicione um veículo para poder abrir uma ordem de serviço."
        action={<Button>Novo veículo</Button>}
      />
    </>
  )}
</main>
```

Detalhe de registro que ainda está carregando **não** mostra "não encontrado":
mostra `LoadingState`. Só depois de a resposta chegar o 404 vira mensagem.

---

## O que não fazer

#### Cor literal

```tsx
// ❌ Cor fora do token. Reprova no CI.
<p className="text-gray-500">Sem telefone</p>
<div className="bg-white border border-gray-200 p-4">
```

```tsx
// ✅ Cor vem do token, e por isso acompanha o tema escuro.
<p className="text-muted">Sem telefone</p>
<div className="rounded-lg border border-line bg-surface p-4 shadow-card">
```

#### Elemento cru no lugar do componente

```tsx
// ❌ `<button>` cru sem classe, `<input>` sem label, `<table>` pelado.
<button onClick={salvar}>Salvar</button>
<input value={nome} onChange={...} placeholder="Nome" />
```

```tsx
// ✅ Componente do sistema, com label associada e área de toque.
<Button onClick={salvar} loading={salvando}>Salvar</Button>

<Field htmlFor="nome" label="Nome" required>
  <Input id="nome" value={nome} onChange={...} />
</Field>
```

#### Recriar o que existe

```tsx
// ❌ Badge reconstruído inline, ao lado de um `Badge` pronto.
<span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
  Finalizada
</span>
```

```tsx
// ✅
<Badge tone="success">Finalizada</Badge>
```

O mesmo vale para `Button`, `Input`, `Card`, `EmptyState` e `ErrorState`: se
existe em `src/components`, use.

#### Estado vazio que não diz o próximo passo

```tsx
// ❌ A pessoa fica sem saber o que fazer.
<p>Nenhum registro.</p>
```

```tsx
// ✅
<EmptyState
  title="Nenhum cliente cadastrado"
  description="Cadastre o primeiro cliente para abrir uma ordem de serviço."
  action={<Button>Novo cliente</Button>}
/>
```

#### Erro genérico

```tsx
// ❌ Esconde a causa de quem precisa agir.
setErro('Falha na operação.');
```

```tsx
// ✅ O texto real, como veio da fonte.
setErro(error.message);
<ErrorState message={error.message} onRetry={refetch} />
```

#### Espaçamento avulso

```tsx
// ❌ Valor fora da escala de 4px.
<div className="mt-[7px] p-[13px] gap-[9px]">
```

```tsx
// ✅ Escala do Tailwind.
<div className="mt-2 p-4 gap-3">
```

#### Tabela que não cabe no celular

```tsx
// ❌ A OS precisa ser lida no celular, no balcão.
<table className="min-w-[900px]">…</table>
```

```tsx
// ✅ Tabela no desktop, lista de cards no celular.
<div className="hidden md:block"><table className="w-full">…</table></div>
<ul className="flex flex-col gap-3 md:hidden">…</ul>
```

#### Ícone sem nome acessível

```tsx
// ❌ Ícone sozinho não tem nome: leitor de tela lê "botão".
<button onClick={excluir}><Trash2 /></button>
```

```tsx
// ✅ Ícone decorativo com texto ao lado, ou `aria-label` no alvo.
<Button variant="danger" icon={<Trash2 className="size-4" aria-hidden="true" />}>
  Excluir
</Button>
```

#### Texto de interface em inglês

```tsx
// ❌
<Button>Save</Button>
```

```tsx
// ✅ Português do Brasil.
<Button>Salvar</Button>
```

Isso vale para o texto de interface. **Mensagem de erro de sistema externo
chega verbatim, no idioma original** — não traduza o que o backend devolveu.

---

## Checklist do card que toca tela

Antes de fechar o card, rode e cole a saída:

```bash
cd frontend
npm run build
npx tsc --noEmit

grep -rnE "text-gray-[0-9]|bg-(black|white)|#[0-9a-fA-F]{6}" src/app src/components \
  | grep -v globals.css     # -> vazio
```

E confirme, na tela:

- [ ] Um título claro e **uma** ação primária destacada das secundárias.
- [ ] Os três estados: vazio (com próximo passo), carregando, erro (com o texto
      real e opção de tentar de novo).
- [ ] Componentes de `src/components` reusados; nenhum `<button>`, `<input>` ou
      `<table>` cru.
- [ ] Toda cor vinda de token; nenhum literal fora de `globals.css`.
- [ ] Label associada a todo campo (`htmlFor` + `id`), foco visível, área de
      toque ≥ 44px.
- [ ] Usável no celular (390px) com o polegar.
- [ ] Componente novo criado neste PR já está neste documento.

Card que mudou tela visivelmente: anexe screenshot desktop e mobile. "Ficou
bom" não é evidência.
