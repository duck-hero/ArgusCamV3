using ArgusCam.Infrastructure.Database;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArgusCam.Infrastructure.Database.Migrations
{
    [DbContext(typeof(ArgusCamDbContext))]
    [Migration("20260307093000_AddCameraProviderKey")]
    /// <inheritdoc />
    public partial class AddCameraProviderKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProviderKey",
                table: "Cameras",
                type: "TEXT",
                nullable: false,
                defaultValue: "hikvision");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProviderKey",
                table: "Cameras");
        }
    }
}
