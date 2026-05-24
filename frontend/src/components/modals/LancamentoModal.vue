<template>
  <BaseModal ref="modalRef" @close="reset">
    <form @submit.prevent="handleSubmit">
      <div class="modal-header">
        <h3>{{ editItem ? 'Editar lançamento' : 'Novo lançamento' }}</h3>
        <button type="button" class="btn-icon" aria-label="Fechar" @click="close">
          <span class="material-icons" aria-hidden="true">close</span>
        </button>
      </div>
      <div class="modal-body">
        <label>
          Tipo
          <select v-model="form.tipo" required :disabled="!!editItem" @change="form.secao = ''">
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </label>
        <label>
          Descrição
          <input v-model="form.descricao" type="text" maxlength="120" required placeholder="Ex.: Salário, Condomínio">
        </label>
        <label id="secaoField">
          Seção
          <div class="field-with-action">
            <select v-model="form.secao">
              <option v-for="s in secoesDisponiveis" :key="s" :value="s">{{ s }}</option>
            </select>
            <button type="button" class="btn btn-ghost btn-sm" @click="showNovaSecao = true" v-if="!showNovaSecao">+ Nova</button>
          </div>
          <div v-if="showNovaSecao" class="nova-secao-form">
            <input v-model="novaSecaoNome" type="text" maxlength="80" placeholder="Nome da nova seção" @keydown.enter.prevent="criarSecao">
            <div class="nova-secao-actions">
              <button type="button" class="btn btn-primary btn-sm" @click="criarSecao">Criar</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="showNovaSecao = false">Cancelar</button>
            </div>
          </div>
        </label>
        <label>
          Valor (R$)
          <input v-model.number="form.valor" type="number" min="0.01" step="0.01" required>
        </label>
        <label>
          Observação
          <input v-model="form.observacao" type="text" maxlength="200" placeholder="Opcional">
        </label>
        <label>
          Tags
          <div class="tag-input" id="tagInput">
            <div class="tag-chips">
              <span v-for="(tag, idx) in form.tags" :key="idx" class="tag-chip tag-chip-removable">
                {{ tag }}
                <button type="button" class="tag-remove" :aria-label="`Remover ${tag}`" @click="removeTag(idx)">
                  <span class="material-icons" aria-hidden="true">close</span>
                </button>
              </span>
            </div>
            <input
              v-model="tagText"
              type="text"
              maxlength="40"
              placeholder="Digite e pressione Enter"
              :list="`tagSuggestions-modal`"
              autocomplete="off"
              @keydown.enter.prevent="addTag"
              @keydown.comma.prevent="addTag"
              @keydown.backspace="onTagBackspace"
              @blur="addTag"
            >
          </div>
          <datalist :id="`tagSuggestions-modal`">
            <option v-for="t in gastosStore.allTags" :key="t" :value="t"></option>
          </datalist>
          <small class="field-hint">Separe com Enter ou vírgula. Crie novas tags ao digitar.</small>
        </label>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'

const gastosStore = useGastosStore()
const { toast } = useToast()

const modalRef = ref(null)
const editItem = ref(null) // item sendo editado, null = novo
const defaultTipo = ref('despesa')

const form = ref({
  tipo: 'despesa',
  descricao: '',
  observacao: '',
  valor: '',
  secao: '',
  tags: [],
})

const tagText = ref('')
const showNovaSecao = ref(false)
const novaSecaoNome = ref('')

const secoesDisponiveis = computed(() =>
  gastosStore.secoes[form.value.tipo] || []
)

function open(tipo = 'despesa', item = null) {
  editItem.value = item
  defaultTipo.value = tipo
  form.value = {
    tipo: item ? item.tipo || tipo : tipo,
    descricao: item?.descricao || '',
    observacao: item?.observacao || '',
    valor: item?.valor || '',
    secao: item?.secao || secoesDisponiveis.value[0] || '',
    tags: item?.tags ? [...(Array.isArray(item.tags) ? item.tags : String(item.tags).split(',').map(t => t.trim()).filter(Boolean))] : [],
  }
  tagText.value = ''
  showNovaSecao.value = false
  novaSecaoNome.value = ''
  modalRef.value?.open()
}

function close() {
  modalRef.value?.close()
}

function reset() {
  editItem.value = null
}

function addTag() {
  const name = tagText.value.trim().replace(/,$/, '')
  if (!name) return
  const key = name.toLowerCase()
  if (!form.value.tags.some((t) => t.toLowerCase() === key)) {
    form.value.tags.push(name)
  }
  tagText.value = ''
}

function removeTag(idx) {
  form.value.tags.splice(idx, 1)
}

function onTagBackspace() {
  if (!tagText.value && form.value.tags.length) {
    form.value.tags.pop()
  }
}

async function criarSecao() {
  const nome = novaSecaoNome.value.trim()
  if (!nome) { toast('Informe o nome da seção', true); return }
  try {
    const criado = await gastosStore.criarSecao(form.value.tipo, nome)
    form.value.secao = criado
    showNovaSecao.value = false
    novaSecaoNome.value = ''
  } catch (err) {
    toast(err.message, true)
  }
}

async function handleSubmit() {
  // Flush pending tag text
  if (tagText.value.trim()) addTag()

  const payload = {
    valor: Number(form.value.valor),
    descricao: form.value.descricao.trim(),
    observacao: form.value.observacao.trim(),
    secao: form.value.secao,
    tags: form.value.tags,
  }

  if (!editItem.value) {
    payload.ano = gastosStore.ano
    payload.mes = gastosStore.mes
    payload.tipo = form.value.tipo
  }

  try {
    await gastosStore.saveLancamento(payload, editItem.value?.id || null)
    close()
  } catch (err) {
    toast(err.message, true)
  }
}

// Auto-select first seção when tipo changes
watch(() => form.value.tipo, () => {
  form.value.secao = secoesDisponiveis.value[0] || ''
})

defineExpose({ open, close })
</script>
