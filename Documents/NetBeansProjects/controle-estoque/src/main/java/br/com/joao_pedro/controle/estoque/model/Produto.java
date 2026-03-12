package br.com.joao_pedro.controle.estoque.model;

public class Produto {

    private int id;
    private String codigo;
    private String nome;
    private int quantidade;
    private double preco;
    private String categoria;
    private int estoqueMinimo = 10;

    // getters e setters
    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public int getQuantidade() {
        return quantidade;
    }

    public void setQuantidade(int quantidade) {
        this.quantidade = quantidade;
    }

    public double getPreco() {
        return preco;
    }

    public void setPreco(double preco) {
        this.preco = preco;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public int getEstoqueMinimo() {
        return estoqueMinimo;
    }

    public void setEstoqueMinimo(int estoqueMinimo) {
        this.estoqueMinimo = estoqueMinimo;
    }

    @Override
    public String toString() {
        return "Produto id=" + id + "   ||    codigo=" + codigo + "\nnome=" + nome + "    ||    qtd=" + quantidade + "\npreço="+preco 
                + "    ||    estoque_minimo=" + estoqueMinimo;
    }
}
