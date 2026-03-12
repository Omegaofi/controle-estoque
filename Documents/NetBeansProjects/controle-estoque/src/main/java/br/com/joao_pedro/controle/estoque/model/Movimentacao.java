package br.com.joao_pedro.controle.estoque.model;

import java.sql.Date;
import java.util.List;
import java.util.ArrayList;

public class Movimentacao {

    private int id;
    private int produtoId;
    private String tipo;  // "ENTRADA" ou "SAIDA"
    private int quantidade;
    private Date data;
    private String motivo;

    public Movimentacao() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getProdutoId() {
        return produtoId;
    }

    public void setProdutoId(int produtoId) {
        this.produtoId = produtoId;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public int getQuantidade() {
        return quantidade;
    }

    public void setQuantidade(int quantidade) {
        this.quantidade = quantidade;
    }

    public Date getData() {
        return data;
    }

    public void setData(Date data) {
        this.data = data;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

// no toString:
    @Override
    public String toString() {
        return "Movimentacao{"
                + "id=" + id
                + ", produtoId=" + produtoId
                + ", tipo='" + tipo + '\''
                + ", quantidade=" + quantidade
                + ", data=" + data
                + ", motivo='" + motivo + '\''
                + '}';
    }
}
