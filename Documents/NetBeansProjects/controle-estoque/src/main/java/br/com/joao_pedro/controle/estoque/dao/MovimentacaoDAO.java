/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package br.com.joao_pedro.controle.estoque.dao;

import br.com.joao_pedro.controle.estoque.util.ConnectionFactory;
import br.com.joao_pedro.controle.estoque.model.Movimentacao;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class MovimentacaoDAO {

    public List<Movimentacao> listarPorProduto(int produtoId) {
        List<Movimentacao> lista = new ArrayList<>();
        String sql = "SELECT * FROM movimentacoes WHERE produto_id = ? ORDER BY data_mov DESC";

        try (Connection conn = ConnectionFactory.getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, produtoId);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                Movimentacao m = new Movimentacao();
                m.setId(rs.getInt("id"));
                m.setProdutoId(rs.getInt("produto_id"));
                m.setTipo(rs.getString("tipo"));
                m.setQuantidade(rs.getInt("quantidade"));
                m.setData(rs.getDate("data_mov"));  
                m.setMotivo(rs.getString("motivo"));
                lista.add(m);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return lista;
    }

    public void registrar(int produtoId, String tipo, int quantidade, double valor, String motivo) {
        String sql = "INSERT INTO movimentacoes (produto_id, tipo, quantidade, motivo, data_mov) VALUES ( ?, ?, ?, ?, ?)";
        try (Connection conn = ConnectionFactory.getConnection(); 
                PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            stmt.setInt(1, produtoId);
            stmt.setString(2, tipo);
            stmt.setInt(3, quantidade);
            stmt.setString(4, motivo);
            // data_mov usa CURRENT_DATE do banco

            stmt.executeUpdate();
            stmt.setDate(6, Date.valueOf(java.time.LocalDate.now()));
            ResultSet rs = stmt.getGeneratedKeys();
            if (rs.next()) {
                System.out.println("Movimentação registrada com ID: " + rs.getInt(1));
            }
        } catch (SQLException e) {
            System.out.println("Erro ao registrar movimentação: " + e.getMessage());
        }
    }

    

    public void registrar(int produtoId, String tipo, int quantidade, String motivo) {
        String sql = "INSERT INTO movimentacoes (produto_id, tipo, quantidade, motivo) VALUES (?, ?, ?, ?)";
        try (Connection conn = ConnectionFactory.getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, produtoId);
            stmt.setString(2, tipo);
            stmt.setInt(3, quantidade);
            stmt.setString(4, motivo);
            stmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

}
