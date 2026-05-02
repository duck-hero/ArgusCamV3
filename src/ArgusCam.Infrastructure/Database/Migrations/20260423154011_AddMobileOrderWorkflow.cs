using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArgusCam.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddMobileOrderWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DeskId",
                table: "Orders",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurrentSessionId",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_DeskId",
                table: "Orders",
                column: "DeskId");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Desks_DeskId",
                table: "Orders",
                column: "DeskId",
                principalTable: "Desks",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Desks_DeskId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_DeskId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeskId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CurrentSessionId",
                table: "AspNetUsers");
        }
    }
}
